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
    const populationBudget = Math.max(8, Math.round(baseBudget * (reinforced ? 1.10 : 1)));

    const heavyRatio = normalizedWave < 6
      ? 0
      : Math.min(0.28, 0.08 + (normalizedWave - 6) * 0.0022);
    const flyingRatio = normalizedWave < 20
      ? 0
      : Math.min(0.22, 0.08 + (normalizedWave - 20) * 0.00175);

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
    const hpMultiplier = (1 + 0.055 * index) * Math.pow(1.018, index);
    const damageMultiplier = (1 + 0.035 * index) * Math.pow(1.012, index);

    return {
      hpMultiplier: Math.min(1_000_000, hpMultiplier),
      damageMultiplier: Math.min(1_000_000, damageMultiplier),
    };
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
    if (wave <= 20) return 22.4 + (wave - 10) * 0.8;
    if (wave <= 50) return 30.4 + (wave - 20) * 0.5;
    return 45.4 + (wave - 50) * 0.3;
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
