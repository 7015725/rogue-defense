export const SAVE_VERSION = 1;
export const ACCOUNT_LEVEL_CAP = 100;
export const DIFFICULTY_CAP = 5;

export type TechId =
  | 'damage-training'
  | 'base-fortification'
  | 'starting-credits'
  | 'speed-control'
  | 'reroll-prep';

export interface TechLevels {
  damageTraining: number;
  baseFortification: number;
  startingCredits: number;
  speedControl: number;
  rerollPrep: number;
}

export interface LifetimeStats {
  runs: number;
  kills: number;
  bossKills: number;
  totalGoldEarned: number;
  highestRunLevel: number;
}

export interface PermanentSave {
  version: number;
  accountLevel: number;
  accountXp: number;
  gold: number;
  techPoints: number;
  tech: TechLevels;
  maxDifficultyUnlocked: number;
  selectedDifficulty: number;
  highWaveByDifficulty: number[];
  lifetime: LifetimeStats;
}

export interface RunSummary {
  difficulty: number;
  highestWave: number;
  runLevel: number;
  kills: number;
  bossKills: number;
  reason: 'BASE_DESTROYED' | 'VOLUNTARY_EXIT' | 'TEST_COMPLETE';
  debugRun?: boolean;
}

export interface SettlementRewards {
  gold: number;
  accountXp: number;
  levelsGained: number;
  difficultyUnlocked: number | null;
}

export interface DifficultyDefinition {
  id: number;
  label: string;
  enemyHpMultiplier: number;
  enemyDamageMultiplier: number;
  rewardMultiplier: number;
}

export const DIFFICULTIES: readonly DifficultyDefinition[] = [
  { id: 1, label: 'I', enemyHpMultiplier: 1.00, enemyDamageMultiplier: 1.00, rewardMultiplier: 1.00 },
  { id: 2, label: 'II', enemyHpMultiplier: 1.20, enemyDamageMultiplier: 1.10, rewardMultiplier: 1.15 },
  { id: 3, label: 'III', enemyHpMultiplier: 1.45, enemyDamageMultiplier: 1.20, rewardMultiplier: 1.35 },
  { id: 4, label: 'IV', enemyHpMultiplier: 1.75, enemyDamageMultiplier: 1.35, rewardMultiplier: 1.60 },
  { id: 5, label: 'V', enemyHpMultiplier: 2.10, enemyDamageMultiplier: 1.50, rewardMultiplier: 2.00 },
] as const;

export function createDefaultSave(): PermanentSave {
  return {
    version: SAVE_VERSION,
    accountLevel: 1,
    accountXp: 0,
    gold: 0,
    techPoints: 0,
    tech: {
      damageTraining: 0,
      baseFortification: 0,
      startingCredits: 0,
      speedControl: 0,
      rerollPrep: 0,
    },
    maxDifficultyUnlocked: 1,
    selectedDifficulty: 1,
    highWaveByDifficulty: [0, 0, 0, 0, 0],
    lifetime: {
      runs: 0,
      kills: 0,
      bossKills: 0,
      totalGoldEarned: 0,
      highestRunLevel: 1,
    },
  };
}

export function getDifficulty(id: number): DifficultyDefinition {
  return DIFFICULTIES[Math.max(0, Math.min(DIFFICULTIES.length - 1, Math.floor(id) - 1))];
}

export function getAccountXpToNext(level: number): number {
  if (level >= ACCOUNT_LEVEL_CAP) return 0;
  return 100 + (Math.max(1, level) - 1) * 30;
}

export function getMaxGameSpeed(save: PermanentSave): number {
  // Temporary playtest rule: expose the full existing 1x–4x speed range regardless of meta progression.
  const unlockedByTech = Math.min(4, 1 + Math.max(0, Math.min(3, save.tech.speedControl)));
  return Math.max(4, unlockedByTech);
}
