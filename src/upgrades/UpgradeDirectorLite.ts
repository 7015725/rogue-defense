import {
  RANDOM_WEAPON_DEFINITIONS,
  RANDOM_WEAPON_IDS,
  WEAPON_LEVEL_ATTACK_SPEED_PER_LEVEL,
  WEAPON_LEVEL_CAP,
  WEAPON_LEVEL_DAMAGE_PER_LEVEL,
  WEAPON_LEVEL_UPGRADE_POOL_WEIGHT,
  type RandomWeaponId,
} from '../combat/constants';
import type { ComboId } from '../combat/types';

export type UpgradeKind =
  | 'global-damage'
  | 'global-attack-speed'
  | 'base-max-hp'
  | 'base-damage-reduction'
  | 'xp-gain'
  | 'reroll-charge'
  | 'base-heal'
  | 'weapon-repair'
  | 'weapon-level'
  | 'unlock-weapon'
  | 'combo';

export interface UpgradeOption {
  id: string;
  kind: UpgradeKind;
  title: string;
  description: string;
  rarity: 'COMMON' | 'RARE';
  weight: number;
  weaponId?: string;
  comboId?: ComboId;
}

export interface OwnedWeaponSnapshot {
  id: string;
  name: string;
  level: number;
  currentHp: number;
  maxHp: number;
}

export interface UpgradeContext {
  runLevel: number;
  currentWave: number;
  ownedWeapons: readonly OwnedWeaponSnapshot[];
  ownedRandomWeaponIds: readonly RandomWeaponId[];
  activeComboIds: readonly ComboId[];
  globalDamageLevel: number;
  globalAttackSpeedLevel: number;
  baseHpUpgradeLevel: number;
  baseDamageReductionLevel: number;
  xpGainLevel: number;
  baseCurrentHp: number;
  baseMaxHp: number;
}

const BASE_OPTIONS: readonly UpgradeOption[] = [
  {
    id: 'global-damage',
    kind: 'global-damage',
    title: '强化弹药',
    description: '所有武器伤害 +10%',
    rarity: 'COMMON',
    weight: 10,
  },
  {
    id: 'global-attack-speed',
    kind: 'global-attack-speed',
    title: '快速循环',
    description: '所有武器攻击速度 +8%',
    rarity: 'COMMON',
    weight: 10,
  },
  {
    id: 'base-max-hp',
    kind: 'base-max-hp',
    title: '加固基地',
    description: '基地最大生命 +12%\n并增加等量当前生命',
    rarity: 'COMMON',
    weight: 8,
  },
  {
    id: 'base-damage-reduction',
    kind: 'base-damage-reduction',
    title: '复合装甲',
    description: '基地受到的伤害 -5%\n最多叠加到 30%',
    rarity: 'COMMON',
    weight: 7,
  },
  {
    id: 'xp-gain',
    kind: 'xp-gain',
    title: '战场分析',
    description: '后续击杀获得的局内经验 +8%\n乘算叠加，最多选择 6 次',
    rarity: 'RARE',
    weight: 5,
  },
  {
    id: 'reroll-charge',
    kind: 'reroll-charge',
    title: '战术重规划',
    description: '立即获得 1 次升级重抽次数',
    rarity: 'RARE',
    weight: 4,
  },
];

const WEAPON_DESCRIPTIONS: Record<RandomWeaponId, string> = {
  lmg: '定位：持续火力 · 可对空\n全场锁定 · 60 发弹匣，耗尽后换弹',
  sniper: '定位：高伤单体 · 可对空\n全场锁定 · 优先最高 HP，高暴击低射速',
  'auto-gl': '定位：范围爆炸 · 仅地面\n全场锁定 · 延迟落点后造成范围伤害',
  tesla: '定位：连锁控制 · 仅地面\n主目标全场锁定 · 近距连锁并施加充能/眩晕',
};

const SECONDARY_AA_IDS = new Set<RandomWeaponId>(['lmg', 'sniper']);

export class UpgradeDirectorLite {
  private antiAirOfferCount = 0;

  generate(context: UpgradeContext): UpgradeOption[] {
    const baseEligible = BASE_OPTIONS.filter((option) => this.isBaseEligible(option.kind, context));
    const recoveryOptions = this.buildRecoveryOptions(context);
    const levelOptions = this.buildWeaponLevelOptions(context);
    const unlockOptions = this.buildWeaponUnlockOptions(context);
    const comboOptions = this.buildComboOptions(context);
    const eligible = [...baseEligible, ...recoveryOptions, ...levelOptions, ...unlockOptions, ...comboOptions];
    const selected: UpgradeOption[] = [];

    // Run Lv5 is the hard new-weapon checkpoint. Rerolls at Lv5 keep this guarantee.
    if (context.runLevel === 5 && unlockOptions.length > 0) {
      selected.push(unlockOptions[Math.floor(Math.random() * unlockOptions.length)]);
    }

    // Owned-weapon level-ups are deliberately not guaranteed. They stay in the weighted pool
    // with a capped category weight so owning more weapons does not make level-up cards dominate.
    const hasSecondaryAa = context.ownedRandomWeaponIds.some((id) => SECONDARY_AA_IDS.has(id));
    const aaUnlockOptions = unlockOptions.filter(
      (option) => option.weaponId && SECONDARY_AA_IDS.has(option.weaponId as RandomWeaponId),
    );
    const selectedHasAaUnlock = selected.some(
      (option) => option.weaponId && SECONDARY_AA_IDS.has(option.weaponId as RandomWeaponId),
    );
    const forceAaOffer = context.currentWave >= 18
      && !hasSecondaryAa
      && this.antiAirOfferCount === 0
      && !selectedHasAaUnlock
      && aaUnlockOptions.length > 0;

    if (forceAaOffer && selected.length < 3) {
      selected.push(aaUnlockOptions[Math.floor(Math.random() * aaUnlockOptions.length)]);
    }

    const remaining = eligible.filter((option) => !selected.some((picked) => picked.id === option.id));

    while (selected.length < 3 && remaining.length > 0) {
      const alreadyHasWeaponCategory = selected.some((option) => this.isWeaponCategory(option));
      const alreadyHasCombo = selected.some((option) => option.kind === 'combo');
      const weighted = remaining.map((option) => ({
        ...option,
        weight: this.getDiversityWeight(option, alreadyHasWeaponCategory, alreadyHasCombo),
      }));
      const picked = this.pickWeighted(weighted);
      selected.push(picked);
      remaining.splice(remaining.findIndex((option) => option.id === picked.id), 1);
    }

    if (selected.some((option) => option.weaponId && SECONDARY_AA_IDS.has(option.weaponId as RandomWeaponId))) {
      this.antiAirOfferCount += 1;
    }
    return selected;
  }

  private buildRecoveryOptions(context: UpgradeContext): UpgradeOption[] {
    const options: UpgradeOption[] = [];

    if (context.baseCurrentHp < context.baseMaxHp * 0.85) {
      options.push({
        id: 'base-heal',
        kind: 'base-heal',
        title: '应急维修',
        description: '立即恢复基地最大生命的 25%',
        rarity: 'COMMON',
        weight: 6,
      });
    }

    const damagedWeapon = [...context.ownedWeapons]
      .filter((weapon) => weapon.currentHp < weapon.maxHp * 0.75)
      .sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp))[0];
    if (damagedWeapon) {
      options.push({
        id: `weapon-repair:${damagedWeapon.id}`,
        kind: 'weapon-repair',
        title: `战地维修 · ${damagedWeapon.name}`,
        description: '立即恢复该武器最大耐久的 35%\n不会提升武器等级',
        rarity: 'COMMON',
        weight: 5,
        weaponId: damagedWeapon.id,
      });
    }

    return options;
  }

  private buildWeaponLevelOptions(context: UpgradeContext): UpgradeOption[] {
    const eligibleWeapons = context.ownedWeapons.filter((weapon) => weapon.level < WEAPON_LEVEL_CAP);
    const perWeaponWeight = WEAPON_LEVEL_UPGRADE_POOL_WEIGHT / Math.max(1, eligibleWeapons.length);

    return eligibleWeapons.map((weapon) => {
      const milestoneBoost = weapon.level === 4 || weapon.level === 9 ? 1.15 : 1;
      const nextLevel = weapon.level + 1;
      const damageBefore = 1 + WEAPON_LEVEL_DAMAGE_PER_LEVEL * (weapon.level - 1);
      const damageAfter = 1 + WEAPON_LEVEL_DAMAGE_PER_LEVEL * weapon.level;
      const attackSpeedBefore = 1 + WEAPON_LEVEL_ATTACK_SPEED_PER_LEVEL * (weapon.level - 1);
      const attackSpeedAfter = 1 + WEAPON_LEVEL_ATTACK_SPEED_PER_LEVEL * weapon.level;
      const milestone = nextLevel === 5
        ? '\n达到 Lv5 后立即选择 α / β / γ 路线'
        : nextLevel === 10
          ? '\n达到 Lv10 后立即选择路线专精'
          : nextLevel === WEAPON_LEVEL_CAP
            ? '\n达到当前武器等级上限'
            : '';

      return {
        id: `weapon-level:${weapon.id}`,
        kind: 'weapon-level' as const,
        title: `${weapon.name} +1 Lv`,
        description: [
          `Lv${weapon.level} → Lv${nextLevel}`,
          `伤害系数 ${damageBefore.toFixed(2)}× → ${damageAfter.toFixed(2)}×`,
          `攻速系数 ${attackSpeedBefore.toFixed(2)}× → ${attackSpeedAfter.toFixed(2)}×${milestone}`,
        ].join('\n'),
        rarity: 'COMMON' as const,
        weight: perWeaponWeight * milestoneBoost,
        weaponId: weapon.id,
      };
    });
  }

  private buildWeaponUnlockOptions(context: UpgradeContext): UpgradeOption[] {
    if (context.runLevel < 2 || context.ownedRandomWeaponIds.length >= 4) return [];

    const owned = new Set<RandomWeaponId>(context.ownedRandomWeaponIds);
    const hasSecondaryAa = context.ownedRandomWeaponIds.some((id) => SECONDARY_AA_IDS.has(id));
    const baseWeight = context.runLevel >= 8 ? 4 : 2;

    return RANDOM_WEAPON_IDS
      .filter((weaponId) => !owned.has(weaponId))
      .map((weaponId) => {
        const antiAirBoost = context.currentWave >= 15 && !hasSecondaryAa && SECONDARY_AA_IDS.has(weaponId)
          ? 2.5
          : 1;
        return {
          id: `unlock:${weaponId}`,
          kind: 'unlock-weapon' as const,
          title: `新武器 · ${RANDOM_WEAPON_DEFINITIONS[weaponId].name}`,
          description: WEAPON_DESCRIPTIONS[weaponId],
          rarity: 'RARE' as const,
          weight: baseWeight * antiAirBoost,
          weaponId,
        };
      });
  }

  private buildComboOptions(context: UpgradeContext): UpgradeOption[] {
    if (context.runLevel < 8) return [];

    const ownedWeapons = new Set(context.ownedWeapons.map((weapon) => weapon.id));
    const active = new Set<ComboId>(context.activeComboIds);
    const options: UpgradeOption[] = [];

    if (!active.has('CONCUSSIVE_BREAK') && ownedWeapons.has('tesla') && ownedWeapons.has('sniper')) {
      options.push({
        id: 'combo:CONCUSSIVE_BREAK',
        kind: 'combo',
        comboId: 'CONCUSSIVE_BREAK',
        title: '联动 · 震荡破甲',
        description: '武器：Tesla Coil + Bolt-Action Sniper\n触发：目标被 Tesla 眩晕时，Sniper 命中\n效果：护甲 -35，持续 4 秒',
        rarity: 'RARE',
        weight: 4,
      });
    }

    if (!active.has('OVERLOAD') && ownedWeapons.has('tesla')) {
      options.push({
        id: 'combo:OVERLOAD',
        kind: 'combo',
        comboId: 'OVERLOAD',
        title: '联动 · 电力过载',
        description: '武器：Tesla Coil\n触发：已带“充能”的目标再次被 Tesla 命中\n效果：额外 35% 伤害，并电弧溅射最近敌人',
        rarity: 'RARE',
        weight: 4,
      });
    }

    if (!active.has('CONTROL_EXECUTION') && ownedWeapons.has('tesla') && ownedWeapons.has('sniper')) {
      options.push({
        id: 'combo:CONTROL_EXECUTION',
        kind: 'combo',
        comboId: 'CONTROL_EXECUTION',
        title: '联动 · 控制处决',
        description: '武器：Tesla Coil + Bolt-Action Sniper\n触发：目标被 Tesla 眩晕时，Sniper 暴击\n效果：追加本次最终伤害的 75%',
        rarity: 'RARE',
        weight: 4,
      });
    }

    return options;
  }

  private isBaseEligible(kind: UpgradeKind, context: UpgradeContext): boolean {
    if (kind === 'global-damage') return context.globalDamageLevel < 10;
    if (kind === 'global-attack-speed') return context.globalAttackSpeedLevel < 10;
    if (kind === 'base-max-hp') return context.baseHpUpgradeLevel < 10;
    if (kind === 'base-damage-reduction') return context.baseDamageReductionLevel < 6;
    if (kind === 'xp-gain') return context.xpGainLevel < 6;
    return true;
  }

  private isWeaponCategory(option: UpgradeOption): boolean {
    return option.kind === 'weapon-level' || option.kind === 'unlock-weapon';
  }

  private getDiversityWeight(
    option: UpgradeOption,
    alreadyHasWeaponCategory: boolean,
    alreadyHasCombo: boolean,
  ): number {
    if (option.kind === 'unlock-weapon' && alreadyHasWeaponCategory) return option.weight * 0.20;
    if (this.isWeaponCategory(option) && alreadyHasWeaponCategory) return option.weight * 0.35;
    if (option.kind === 'combo' && alreadyHasCombo) return option.weight * 0.35;
    return option.weight;
  }

  private pickWeighted(options: readonly UpgradeOption[]): UpgradeOption {
    const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const option of options) {
      roll -= option.weight;
      if (roll <= 0) return option;
    }

    return options[options.length - 1];
  }
}
