import type { PermanentSave, TechId } from './PermanentProgress';

export interface TechDefinition {
  id: TechId;
  name: string;
  description: string;
  currency: 'GOLD' | 'TECH_POINT';
  maxLevel: number;
  costForNextLevel: (currentLevel: number) => number;
}

export const TECH_DEFINITIONS: readonly TechDefinition[] = [
  {
    id: 'damage-training',
    name: '火力训练',
    description: '每级：所有武器局外基础伤害 +3%',
    currency: 'GOLD',
    maxLevel: 10,
    costForNextLevel: (level) => 80 + level * 60,
  },
  {
    id: 'base-fortification',
    name: '基地加固',
    description: '每级：开局 Base MaxHP +5%',
    currency: 'GOLD',
    maxLevel: 10,
    costForNextLevel: (level) => 80 + level * 60,
  },
  {
    id: 'starting-credits',
    name: '战备资金',
    description: '每级：开局战斗币 +20',
    currency: 'GOLD',
    maxLevel: 5,
    costForNextLevel: (level) => 100 + level * 80,
  },
  {
    id: 'speed-control',
    name: '战术加速',
    description: '依次解锁 2× / 3× / 4× 战斗速度',
    currency: 'TECH_POINT',
    maxLevel: 3,
    costForNextLevel: (level) => [2, 4, 6][level] ?? 999,
  },
  {
    id: 'reroll-prep',
    name: '预备重抽',
    description: '每级：每局开局获得 1 次 Reroll Charge',
    currency: 'TECH_POINT',
    maxLevel: 2,
    costForNextLevel: (level) => [3, 5][level] ?? 999,
  },
] as const;

export class TechTree {
  static getLevel(save: PermanentSave, id: TechId): number {
    switch (id) {
      case 'damage-training': return save.tech.damageTraining;
      case 'base-fortification': return save.tech.baseFortification;
      case 'starting-credits': return save.tech.startingCredits;
      case 'speed-control': return save.tech.speedControl;
      case 'reroll-prep': return save.tech.rerollPrep;
    }
  }

  static buy(save: PermanentSave, id: TechId): boolean {
    const definition = TECH_DEFINITIONS.find((entry) => entry.id === id);
    if (!definition) return false;
    const level = this.getLevel(save, id);
    if (level >= definition.maxLevel) return false;
    const cost = definition.costForNextLevel(level);

    if (definition.currency === 'GOLD') {
      if (save.gold < cost) return false;
      save.gold -= cost;
    } else {
      if (save.techPoints < cost) return false;
      save.techPoints -= cost;
    }

    this.setLevel(save, id, level + 1);
    return true;
  }

  static resetAll(save: PermanentSave): void {
    let goldRefund = 0;
    let techPointRefund = 0;

    for (const definition of TECH_DEFINITIONS) {
      const level = this.getLevel(save, definition.id);
      for (let index = 0; index < level; index += 1) {
        const cost = definition.costForNextLevel(index);
        if (definition.currency === 'GOLD') goldRefund += cost;
        else techPointRefund += cost;
      }
    }

    save.gold += goldRefund;
    save.techPoints += techPointRefund;
    save.tech.damageTraining = 0;
    save.tech.baseFortification = 0;
    save.tech.startingCredits = 0;
    save.tech.speedControl = 0;
    save.tech.rerollPrep = 0;
  }

  private static setLevel(save: PermanentSave, id: TechId, level: number): void {
    switch (id) {
      case 'damage-training': save.tech.damageTraining = level; break;
      case 'base-fortification': save.tech.baseFortification = level; break;
      case 'starting-credits': save.tech.startingCredits = level; break;
      case 'speed-control': save.tech.speedControl = level; break;
      case 'reroll-prep': save.tech.rerollPrep = level; break;
    }
  }
}
