import {
  RANDOM_WEAPON_DEFINITIONS,
  RANDOM_WEAPON_IDS,
  type RandomWeaponId,
} from '../combat/constants';

export type UpgradeId =
  | 'global-damage'
  | 'global-attack-speed'
  | 'base-max-hp'
  | 'auto-cannon-level'
  | `unlock-${RandomWeaponId}`;

export interface UpgradeOption {
  id: UpgradeId;
  title: string;
  description: string;
  rarity: 'COMMON' | 'RARE';
  weight: number;
  weaponId?: RandomWeaponId;
}

export interface UpgradeContext {
  runLevel: number;
  ownedWeaponIds: readonly RandomWeaponId[];
  autoCannonLevel: number;
  globalDamageLevel: number;
  globalAttackSpeedLevel: number;
  baseHpUpgradeLevel: number;
}

const BASE_OPTIONS: readonly UpgradeOption[] = [
  {
    id: 'global-damage',
    title: '强化弹药',
    description: '所有武器伤害 +10%',
    rarity: 'COMMON',
    weight: 10,
  },
  {
    id: 'global-attack-speed',
    title: '快速循环',
    description: '所有武器攻击速度 +8%',
    rarity: 'COMMON',
    weight: 10,
  },
  {
    id: 'base-max-hp',
    title: '加固基地',
    description: '基地最大生命 +12%\n并增加等量当前生命',
    rarity: 'COMMON',
    weight: 8,
  },
  {
    id: 'auto-cannon-level',
    title: '自动炮升级',
    description: 'Auto Cannon +1 Lv\n每级提高伤害与攻击速度',
    rarity: 'COMMON',
    weight: 12,
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
    const baseEligible = BASE_OPTIONS.filter((option) => this.isEligible(option.id, context));
    const weaponOptions = this.buildWeaponOptions(context);
    const eligible = [...baseEligible, ...weaponOptions];
    const selected: UpgradeOption[] = [];

    const forceFirstWeapon = context.ownedWeaponIds.length === 0
      && context.runLevel >= 4
      && this.weaponOfferCount === 0;

    if (forceFirstWeapon && weaponOptions.length > 0) {
      selected.push(weaponOptions[Math.floor(Math.random() * weaponOptions.length)]);
    }

    const remaining = eligible.filter((option) => !selected.some((picked) => picked.id === option.id));

    while (selected.length < 3 && remaining.length > 0) {
      const alreadyHasWeaponOffer = selected.some((option) => option.weaponId !== undefined);
      const weighted = remaining.map((option) => ({
        ...option,
        weight: option.weaponId && alreadyHasWeaponOffer ? option.weight * 0.35 : option.weight,
      }));
      const picked = this.pickWeighted(weighted);
      selected.push(picked);
      remaining.splice(remaining.findIndex((option) => option.id === picked.id), 1);
    }

    if (selected.some((option) => option.weaponId !== undefined)) this.weaponOfferCount += 1;
    return selected;
  }

  private buildWeaponOptions(context: UpgradeContext): UpgradeOption[] {
    if (context.runLevel < 2 || context.ownedWeaponIds.length >= 4) return [];

    const owned = new Set<RandomWeaponId>(context.ownedWeaponIds);
    const weight = context.runLevel >= 3 ? 7 : 3;

    return RANDOM_WEAPON_IDS
      .filter((weaponId) => !owned.has(weaponId))
      .map((weaponId) => ({
        id: `unlock-${weaponId}` as UpgradeId,
        title: RANDOM_WEAPON_DEFINITIONS[weaponId].name,
        description: WEAPON_DESCRIPTIONS[weaponId],
        rarity: 'RARE' as const,
        weight,
        weaponId,
      }));
  }

  private isEligible(id: UpgradeId, context: UpgradeContext): boolean {
    if (id === 'auto-cannon-level') return context.autoCannonLevel < 10;
    if (id === 'global-damage') return context.globalDamageLevel < 10;
    if (id === 'global-attack-speed') return context.globalAttackSpeedLevel < 10;
    if (id === 'base-max-hp') return context.baseHpUpgradeLevel < 10;
    return true;
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
