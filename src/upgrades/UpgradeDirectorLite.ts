import {
  RANDOM_WEAPON_DEFINITIONS,
  RANDOM_WEAPON_IDS,
  type RandomWeaponId,
} from '../combat/constants';
import type { ComboId } from '../combat/types';

export type UpgradeKind =
  | 'global-damage'
  | 'global-attack-speed'
  | 'base-max-hp'
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
];

const WEAPON_DESCRIPTIONS: Record<RandomWeaponId, string> = {
  lmg: '高频持续火力 · 可对空\n独立弹匣与 Reload',
  shotgun: '近距离锥形 AOE · 仅地面\n越靠近命中弹丸越多',
  sniper: '全场高伤单体 · 可对空\n优先最高 HP 目标',
  'auto-gl': '延迟落点爆炸 · 仅地面\n中距离范围伤害',
  tesla: '短距连锁电击 · 仅地面\n3 目标 + Stun / Charged',
};

const SECONDARY_AA_IDS = new Set<RandomWeaponId>(['lmg', 'sniper']);

export class UpgradeDirectorLite {
  private weaponOfferCount = 0;
  private antiAirOfferCount = 0;

  generate(context: UpgradeContext): UpgradeOption[] {
    const baseEligible = BASE_OPTIONS.filter((option) => this.isBaseEligible(option.kind, context));
    const levelOptions = this.buildWeaponLevelOptions(context);
    const unlockOptions = this.buildWeaponUnlockOptions(context);
    const comboOptions = this.buildComboOptions(context);
    const eligible = [...baseEligible, ...levelOptions, ...unlockOptions, ...comboOptions];
    const selected: UpgradeOption[] = [];

    const hasSecondaryAa = context.ownedRandomWeaponIds.some((id) => SECONDARY_AA_IDS.has(id));
    const aaUnlockOptions = unlockOptions.filter(
      (option) => option.weaponId && SECONDARY_AA_IDS.has(option.weaponId as RandomWeaponId),
    );
    const forceAaOffer = context.currentWave >= 18
      && !hasSecondaryAa
      && this.antiAirOfferCount === 0
      && aaUnlockOptions.length > 0;

    if (forceAaOffer) {
      selected.push(aaUnlockOptions[Math.floor(Math.random() * aaUnlockOptions.length)]);
    }

    const forceFirstWeapon = context.ownedRandomWeaponIds.length === 0
      && context.runLevel >= 4
      && this.weaponOfferCount === 0
      && !selected.some((option) => option.kind === 'unlock-weapon');

    if (forceFirstWeapon && unlockOptions.length > 0) {
      selected.push(unlockOptions[Math.floor(Math.random() * unlockOptions.length)]);
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

    if (selected.some((option) => option.kind === 'unlock-weapon')) this.weaponOfferCount += 1;
    if (selected.some((option) => option.weaponId && SECONDARY_AA_IDS.has(option.weaponId as RandomWeaponId))) {
      this.antiAirOfferCount += 1;
    }
    return selected;
  }

  private buildWeaponLevelOptions(context: UpgradeContext): UpgradeOption[] {
    return context.ownedWeapons
      .filter((weapon) => weapon.level < 10)
      .map((weapon) => {
        const milestoneBoost = weapon.level === 4 || weapon.level === 9 ? 1.15 : 1;
        const nextLevel = weapon.level + 1;
        const milestone = nextLevel === 5
          ? '\n达到 Lv5 后立即选择 α / β / γ 路线'
          : nextLevel === 10
            ? '\n达到 Lv10 后立即选择路线专精'
            : '';

        return {
          id: `weapon-level:${weapon.id}`,
          kind: 'weapon-level' as const,
          title: `${weapon.name} +1 Lv`,
          description: `Lv${weapon.level} → Lv${nextLevel}${milestone}`,
          rarity: 'COMMON' as const,
          weight: 12 * milestoneBoost,
          weaponId: weapon.id,
        };
      });
  }

  private buildWeaponUnlockOptions(context: UpgradeContext): UpgradeOption[] {
    if (context.runLevel < 2 || context.ownedRandomWeaponIds.length >= 4) return [];

    const owned = new Set<RandomWeaponId>(context.ownedRandomWeaponIds);
    const hasSecondaryAa = context.ownedRandomWeaponIds.some((id) => SECONDARY_AA_IDS.has(id));
    const baseWeight = context.runLevel >= 3 ? 7 : 3;

    return RANDOM_WEAPON_IDS
      .filter((weaponId) => !owned.has(weaponId))
      .map((weaponId) => {
        const antiAirBoost = context.currentWave >= 15 && !hasSecondaryAa && SECONDARY_AA_IDS.has(weaponId)
          ? 3
          : 1;
        return {
          id: `unlock:${weaponId}`,
          kind: 'unlock-weapon' as const,
          title: RANDOM_WEAPON_DEFINITIONS[weaponId].name,
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

    if (!active.has('DETONATION') && ownedWeapons.has('shotgun') && ownedWeapons.has('auto-gl')) {
      options.push({
        id: 'combo:DETONATION',
        kind: 'combo',
        comboId: 'DETONATION',
        title: '爆燃协议',
        description: 'Burn + Explosion\n结算部分剩余燃烧并消耗 1 层 Burn',
        rarity: 'RARE',
        weight: 4,
      });
    }

    if (!active.has('CONCUSSIVE_BREAK') && ownedWeapons.has('tesla')
      && (ownedWeapons.has('sniper') || ownedWeapons.has('shotgun'))) {
      options.push({
        id: 'combo:CONCUSSIVE_BREAK',
        kind: 'combo',
        comboId: 'CONCUSSIVE_BREAK',
        title: '震荡破甲',
        description: 'Hard Control + Heavy Hit\n目标获得 Armor Break 35 / 4s',
        rarity: 'RARE',
        weight: 4,
      });
    }

    if (!active.has('OVERLOAD') && ownedWeapons.has('tesla')) {
      options.push({
        id: 'combo:OVERLOAD',
        kind: 'combo',
        comboId: 'OVERLOAD',
        title: '电力过载',
        description: 'Charged + Lightning\n追加伤害并向附近目标溢出电弧',
        rarity: 'RARE',
        weight: 4,
      });
    }

    if (!active.has('CONTROL_EXECUTION') && ownedWeapons.has('tesla') && ownedWeapons.has('sniper')) {
      options.push({
        id: 'combo:CONTROL_EXECUTION',
        kind: 'combo',
        comboId: 'CONTROL_EXECUTION',
        title: '控制处决',
        description: 'Hard Control + Sniper Critical\n追加 75% 本次有效伤害',
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
