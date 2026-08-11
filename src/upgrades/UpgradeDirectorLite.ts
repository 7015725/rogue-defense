import {
  RANDOM_WEAPON_DEFINITIONS,
  RANDOM_WEAPON_IDS,
  type RandomWeaponId,
} from '../combat/constants';

export type UpgradeKind =
  | 'global-damage'
  | 'global-attack-speed'
  | 'base-max-hp'
  | 'weapon-level'
  | 'unlock-weapon';

export interface UpgradeOption {
  id: string;
  kind: UpgradeKind;
  title: string;
  description: string;
  rarity: 'COMMON' | 'RARE';
  weight: number;
  weaponId?: string;
}

export interface OwnedWeaponSnapshot {
  id: string;
  name: string;
  level: number;
}

export interface UpgradeContext {
  runLevel: number;
  ownedWeapons: readonly OwnedWeaponSnapshot[];
  ownedRandomWeaponIds: readonly RandomWeaponId[];
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
  lmg: '高频持续火力\n独立弹匣与 Reload',
  shotgun: '近距离锥形 AOE\n越靠近命中弹丸越多',
  sniper: '全场高伤单体\n优先最高 HP 目标',
  'auto-gl': '延迟落点爆炸\n中距离范围伤害',
  tesla: '短距连锁电击\n3 目标 + 轻量 Stun',
};

export class UpgradeDirectorLite {
  private weaponOfferCount = 0;

  generate(context: UpgradeContext): UpgradeOption[] {
    const baseEligible = BASE_OPTIONS.filter((option) => this.isBaseEligible(option.kind, context));
    const levelOptions = this.buildWeaponLevelOptions(context);
    const unlockOptions = this.buildWeaponUnlockOptions(context);
    const eligible = [...baseEligible, ...levelOptions, ...unlockOptions];
    const selected: UpgradeOption[] = [];

    const forceFirstWeapon = context.ownedRandomWeaponIds.length === 0
      && context.runLevel >= 4
      && this.weaponOfferCount === 0;

    if (forceFirstWeapon && unlockOptions.length > 0) {
      selected.push(unlockOptions[Math.floor(Math.random() * unlockOptions.length)]);
    }

    const remaining = eligible.filter((option) => !selected.some((picked) => picked.id === option.id));

    while (selected.length < 3 && remaining.length > 0) {
      const alreadyHasWeaponCategory = selected.some((option) => this.isWeaponCategory(option));
      const weighted = remaining.map((option) => ({
        ...option,
        weight: this.isWeaponCategory(option) && alreadyHasWeaponCategory ? option.weight * 0.35 : option.weight,
      }));
      const picked = this.pickWeighted(weighted);
      selected.push(picked);
      remaining.splice(remaining.findIndex((option) => option.id === picked.id), 1);
    }

    if (selected.some((option) => option.kind === 'unlock-weapon')) this.weaponOfferCount += 1;
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
    const weight = context.runLevel >= 3 ? 7 : 3;

    return RANDOM_WEAPON_IDS
      .filter((weaponId) => !owned.has(weaponId))
      .map((weaponId) => ({
        id: `unlock:${weaponId}`,
        kind: 'unlock-weapon' as const,
        title: RANDOM_WEAPON_DEFINITIONS[weaponId].name,
        description: WEAPON_DESCRIPTIONS[weaponId],
        rarity: 'RARE' as const,
        weight,
        weaponId,
      }));
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
