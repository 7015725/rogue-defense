export type UpgradeId =
  | 'global-damage'
  | 'global-attack-speed'
  | 'base-max-hp'
  | 'auto-cannon-level'
  | 'unlock-lmg';

export interface UpgradeOption {
  id: UpgradeId;
  title: string;
  description: string;
  rarity: 'COMMON' | 'RARE';
  weight: number;
}

export interface UpgradeContext {
  runLevel: number;
  hasLmg: boolean;
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
  {
    id: 'unlock-lmg',
    title: '轻机枪阵地',
    description: '获得第二套独立武器系统\n600 RPM · 60 发弹匣',
    rarity: 'RARE',
    weight: 3,
  },
];

export class UpgradeDirectorLite {
  private lmgOfferCount = 0;

  generate(context: UpgradeContext): UpgradeOption[] {
    const eligible = BASE_OPTIONS
      .filter((option) => this.isEligible(option.id, context))
      .map((option) => ({
        ...option,
        weight: option.id === 'unlock-lmg' && context.runLevel >= 3 ? 8 : option.weight,
      }));

    const selected: UpgradeOption[] = [];
    const forceLmg = !context.hasLmg && context.runLevel >= 4 && this.lmgOfferCount === 0;
    const lmg = eligible.find((option) => option.id === 'unlock-lmg');

    if (forceLmg && lmg) selected.push(lmg);

    const remaining = eligible.filter((option) => !selected.some((picked) => picked.id === option.id));
    while (selected.length < 3 && remaining.length > 0) {
      const picked = this.pickWeighted(remaining);
      selected.push(picked);
      remaining.splice(remaining.findIndex((option) => option.id === picked.id), 1);
    }

    if (selected.some((option) => option.id === 'unlock-lmg')) this.lmgOfferCount += 1;
    return selected;
  }

  private isEligible(id: UpgradeId, context: UpgradeContext): boolean {
    if (id === 'unlock-lmg') return context.runLevel >= 2 && !context.hasLmg;
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
