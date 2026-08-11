import {
  ACCOUNT_LEVEL_CAP,
  DIFFICULTY_CAP,
  SAVE_VERSION,
  createDefaultSave,
  type PermanentSave,
} from './PermanentProgress';

const STORAGE_KEY = 'rogue-defense.save';

export class SaveService {
  static load(): PermanentSave {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultSave();
      return this.normalize(JSON.parse(raw) as unknown);
    } catch (error) {
      console.warn('Save load failed; using defaults.', error);
      return createDefaultSave();
    }
  }

  static save(save: PermanentSave): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.normalize(save)));
    } catch (error) {
      console.warn('Save write failed.', error);
    }
  }

  static reset(): PermanentSave {
    const save = createDefaultSave();
    this.save(save);
    return save;
  }

  private static normalize(input: unknown): PermanentSave {
    const fallback = createDefaultSave();
    if (!input || typeof input !== 'object') return fallback;

    const source = input as Partial<PermanentSave> & { version?: unknown };
    if (source.version !== SAVE_VERSION) {
      return this.migrate(source);
    }

    return this.sanitize(source, fallback);
  }

  private static migrate(source: Partial<PermanentSave>): PermanentSave {
    // M0.9 introduces the first public save schema. Unknown/older shapes are
    // conservatively merged into defaults instead of crashing or trusting them.
    return this.sanitize({ ...source, version: SAVE_VERSION }, createDefaultSave());
  }

  private static sanitize(source: Partial<PermanentSave>, fallback: PermanentSave): PermanentSave {
    const tech = source.tech ?? fallback.tech;
    const lifetime = source.lifetime ?? fallback.lifetime;
    const highWaveSource = Array.isArray(source.highWaveByDifficulty) ? source.highWaveByDifficulty : [];
    const highWaveByDifficulty = Array.from({ length: DIFFICULTY_CAP }, (_, index) => (
      this.nonNegativeInt(highWaveSource[index], fallback.highWaveByDifficulty[index] ?? 0)
    ));

    const maxDifficultyUnlocked = this.clampInt(source.maxDifficultyUnlocked, 1, DIFFICULTY_CAP, 1);
    const selectedDifficulty = this.clampInt(source.selectedDifficulty, 1, maxDifficultyUnlocked, 1);

    return {
      version: SAVE_VERSION,
      accountLevel: this.clampInt(source.accountLevel, 1, ACCOUNT_LEVEL_CAP, 1),
      accountXp: this.nonNegativeInt(source.accountXp, 0),
      gold: this.nonNegativeInt(source.gold, 0),
      techPoints: this.nonNegativeInt(source.techPoints, 0),
      tech: {
        damageTraining: this.clampInt(tech.damageTraining, 0, 10, 0),
        baseFortification: this.clampInt(tech.baseFortification, 0, 10, 0),
        startingCredits: this.clampInt(tech.startingCredits, 0, 5, 0),
        speedControl: this.clampInt(tech.speedControl, 0, 3, 0),
        rerollPrep: this.clampInt(tech.rerollPrep, 0, 2, 0),
      },
      maxDifficultyUnlocked,
      selectedDifficulty,
      highWaveByDifficulty,
      lifetime: {
        runs: this.nonNegativeInt(lifetime.runs, 0),
        kills: this.nonNegativeInt(lifetime.kills, 0),
        bossKills: this.nonNegativeInt(lifetime.bossKills, 0),
        totalGoldEarned: this.nonNegativeInt(lifetime.totalGoldEarned, 0),
        highestRunLevel: this.clampInt(lifetime.highestRunLevel, 1, 9999, 1),
      },
    };
  }

  private static nonNegativeInt(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value)
      ? Math.max(0, Math.floor(value))
      : fallback;
  }

  private static clampInt(value: unknown, min: number, max: number, fallback: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
    return Math.max(min, Math.min(max, Math.floor(value)));
  }
}
