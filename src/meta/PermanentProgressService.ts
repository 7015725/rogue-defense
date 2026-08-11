import {
  ACCOUNT_LEVEL_CAP,
  DIFFICULTY_CAP,
  getAccountXpToNext,
  getDifficulty,
  type PermanentSave,
  type RunSummary,
  type SettlementRewards,
} from './PermanentProgress';

export class PermanentProgressService {
  static settle(save: PermanentSave, summary: RunSummary): SettlementRewards {
    const difficulty = getDifficulty(summary.difficulty);
    const gold = Math.max(0, Math.round((
      20
      + summary.highestWave * 6
      + summary.kills * 0.35
      + summary.bossKills * 25
      + summary.runLevel * 3
    ) * difficulty.rewardMultiplier));
    const accountXp = Math.max(0, Math.round((
      25
      + summary.highestWave * 8
      + summary.kills * 0.5
      + summary.bossKills * 40
      + summary.runLevel * 4
    ) * difficulty.rewardMultiplier));

    save.gold += gold;
    save.lifetime.runs += 1;
    save.lifetime.kills += summary.kills;
    save.lifetime.bossKills += summary.bossKills;
    save.lifetime.totalGoldEarned += gold;
    save.lifetime.highestRunLevel = Math.max(save.lifetime.highestRunLevel, summary.runLevel);

    const difficultyIndex = Math.max(0, Math.min(DIFFICULTY_CAP - 1, summary.difficulty - 1));
    save.highWaveByDifficulty[difficultyIndex] = Math.max(
      save.highWaveByDifficulty[difficultyIndex] ?? 0,
      summary.highestWave,
    );

    const previousLevel = save.accountLevel;
    this.addAccountXp(save, accountXp);
    const levelsGained = save.accountLevel - previousLevel;

    let difficultyUnlocked: number | null = null;
    if (
      summary.highestWave >= 100
      && summary.difficulty === save.maxDifficultyUnlocked
      && save.maxDifficultyUnlocked < DIFFICULTY_CAP
    ) {
      save.maxDifficultyUnlocked += 1;
      difficultyUnlocked = save.maxDifficultyUnlocked;
    }

    save.selectedDifficulty = Math.min(save.selectedDifficulty, save.maxDifficultyUnlocked);
    return { gold, accountXp, levelsGained, difficultyUnlocked };
  }

  private static addAccountXp(save: PermanentSave, amount: number): void {
    if (save.accountLevel >= ACCOUNT_LEVEL_CAP) {
      save.accountXp = 0;
      return;
    }

    save.accountXp += Math.max(0, Math.floor(amount));
    while (save.accountLevel < ACCOUNT_LEVEL_CAP) {
      const required = getAccountXpToNext(save.accountLevel);
      if (required <= 0 || save.accountXp < required) break;
      save.accountXp -= required;
      save.accountLevel += 1;
      save.techPoints += 1;
    }

    if (save.accountLevel >= ACCOUNT_LEVEL_CAP) save.accountXp = 0;
  }
}
