import type { EnemyKind } from '../combat/types';

export interface WaveComposition {
  readonly infantry: number;
  readonly heavy: number;
  readonly flying: number;
  readonly populationBudget: number;
  readonly reinforced: boolean;
}

export interface WaveScaling {
  readonly hpMultiplier: number;
  readonly damageMultiplier: number;
}

const POPULATION_COST: Readonly<Record<Exclude<EnemyKind, 'boss'>, number>> = {
  infantry: 1,
  heavy: 2.5,
  flying: 1.5,
};

let activeSpawnWave = 1;

export class WaveDirector {
  static getRegularComposition(wave: number): WaveComposition {
    const normalizedWave = Math.max(1, Math.floor(wave));
    const reinforced = normalizedWave % 5 === 0 && normalizedWave % 10 !== 0;
    const baseBudget = this.getBasePopulationBudget(normalizedWave);
    const populationBudget = Math.max(8, Math.round(baseBudget * (reinforced ? 1.15 : 1)));

    const heavyRatio = normalizedWave < 6
      ? 0
      : Math.min(0.30, 0.09 + (normalizedWave - 6) * 0.0024);
    const flyingRatio = normalizedWave < 20
      ? 0
      : Math.min(0.24, 0.09 + (normalizedWave - 20) * 0.0019);

    const ratioHeavy = Math.max(0, Math.floor((populationBudget * heavyRatio) / POPULATION_COST.heavy));
    const ratioFlying = Math.max(0, Math.floor((populationBudget * flyingRatio) / POPULATION_COST.flying));
    const heavy = Math.max(ratioHeavy, this.getMinimumHeavyCount(normalizedWave));
    const flying = Math.max(ratioFlying, this.getMinimumFlyingCount(normalizedWave));
    const spent = heavy * POPULATION_COST.heavy + flying * POPULATION_COST.flying;
    const infantry = Math.max(1, Math.floor((populationBudget - spent) / POPULATION_COST.infantry));

    return { infantry, heavy, flying, populationBudget, reinforced };
  }

  static getScaling(wave: number): WaveScaling {
    const normalizedWave = Math.max(1, Math.floor(wave));
    const index = normalizedWave - 1;
    const hpMultiplier = (1 + 0.065 * index) * Math.pow(1.021, index);
    const damageMultiplier = (1 + 0.038 * index) * Math.pow(1.013, index);

    return {
      hpMultiplier: Math.min(1_000_000, hpMultiplier),
      damageMultiplier: Math.min(1_000_000, damageMultiplier),
    };
  }

  static getRewardMultiplier(wave: number): number {
    const normalizedWave = Math.max(1, Math.floor(wave));
    return Math.min(2.5, 1 + (normalizedWave - 1) * 0.01);
  }

  static getBossEscortCount(wave: number): number {
    const normalizedWave = Math.max(1, Math.floor(wave));
    if (normalizedWave < 20) return 0;
    const checkpoint = Math.floor(normalizedWave / 10);
    return Math.min(20, 2 + checkpoint * 2);
  }

  static setActiveSpawnWave(wave: number): void {
    activeSpawnWave = Math.max(1, Math.floor(wave));
  }

  static getActiveSpawnWave(): number {
    return activeSpawnWave;
  }

  static getActiveSpawnScaling(): WaveScaling {
    return this.getScaling(activeSpawnWave);
  }

  private static getBasePopulationBudget(wave: number): number {
    if (wave <= 10) return 8 + (wave - 1) * 1.6;
    if (wave <= 20) return 22.4 + (wave - 10) * 0.9;
    if (wave <= 50) return 31.4 + (wave - 20) * 0.55;
    return 47.9 + (wave - 50) * 0.33;
  }

  private static getMinimumHeavyCount(wave: number): number {
    if (wave < 6) return 0;
    if (wave === 6) return 1;
    if (wave === 7 || wave === 8) return 2;
    if (wave === 9) return 3;
    if (wave === 10) return 0;
    return Math.min(8, 2 + Math.floor((wave - 11) / 10));
  }

  private static getMinimumFlyingCount(wave: number): number {
    if (wave <= 20) return 0;
    return Math.min(8, 1 + Math.floor((wave - 21) / 15));
  }
}
