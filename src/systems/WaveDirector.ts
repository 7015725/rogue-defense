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
    const populationBudget = Math.max(7, Math.round(baseBudget * (reinforced ? 1.08 : 1)));
    const lateWave = Math.max(0, normalizedWave - 40);

    const heavyRatio = normalizedWave < 8
      ? 0
      : Math.min(0.30, 0.06 + (normalizedWave - 8) * 0.0018 + lateWave * 0.0010);
    const flyingRatio = normalizedWave <= 20
      ? 0
      : Math.min(0.21, 0.055 + (normalizedWave - 21) * 0.0014 + lateWave * 0.0008);

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

    if (normalizedWave <= 20) {
      const index = normalizedWave - 1;
      const hpMultiplier = (1 + 0.032 * index) * Math.pow(1.009, index);
      const damageMultiplier = (1 + 0.018 * index) * Math.pow(1.005, index);
      return { hpMultiplier, damageMultiplier };
    }

    const earlyIndex = 19;
    const hpAtWave20 = (1 + 0.032 * earlyIndex) * Math.pow(1.009, earlyIndex);
    const damageAtWave20 = (1 + 0.018 * earlyIndex) * Math.pow(1.005, earlyIndex);

    if (normalizedWave <= 30) {
      const post20 = normalizedWave - 20;
      const hpMultiplier = hpAtWave20 * (1 + 0.018 * post20) * Math.pow(1.010, post20);
      const damageMultiplier = damageAtWave20 * (1 + 0.012 * post20) * Math.pow(1.006, post20);
      return { hpMultiplier, damageMultiplier };
    }

    // Keep the gentler early-game curve intact, then let enemy durability catch up with
    // completed Lv10 weapon builds. Damage grows more slowly than HP to avoid sudden base one-shots.
    const hpAtWave30 = hpAtWave20 * (1 + 0.018 * 10) * Math.pow(1.010, 10);
    const damageAtWave30 = damageAtWave20 * (1 + 0.012 * 10) * Math.pow(1.006, 10);
    const post30 = normalizedWave - 30;
    const hpMultiplier = hpAtWave30 * (1 + 0.060 * post30) * Math.pow(1.026, post30);
    const damageMultiplier = damageAtWave30 * (1 + 0.020 * post30) * Math.pow(1.009, post30);

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
    return Math.min(12, 2 + checkpoint);
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
    if (wave <= 10) return 7 + (wave - 1) * 1.25;
    if (wave <= 20) return 18.25 + (wave - 10) * 0.60;
    if (wave <= 40) return 24.25 + (wave - 20) * 0.38;
    if (wave <= 70) return 31.85 + (wave - 40) * 0.48;
    return 46.25 + (wave - 70) * 0.35;
  }

  private static getMinimumHeavyCount(wave: number): number {
    if (wave < 8) return 0;
    if (wave === 8) return 1;
    if (wave === 9) return 2;
    if (wave === 10) return 0;
    if (wave <= 16) return 1;
    if (wave <= 20) return 2;
    return Math.min(6, 2 + Math.floor((wave - 21) / 15));
  }

  private static getMinimumFlyingCount(wave: number): number {
    if (wave <= 20) return 0;
    return Math.min(6, 1 + Math.floor((wave - 21) / 20));
  }
}
