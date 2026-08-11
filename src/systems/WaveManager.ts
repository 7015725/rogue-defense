import { TEST_WAVE_COMPOSITIONS, WAVE_DURATION_MS, WAVE_SPAWN_WINDOW_MS } from '../combat/constants';
import type { EnemyKind } from '../combat/types';

export type SpawnRequest = { kind: EnemyKind; laneIndex: number };

export class WaveManager {
  private waveNumber = 1;
  private waveElapsedMs = 0;
  private spawnedThisWave = 0;
  private spawnedHeavyThisWave = 0;
  private bossSpawned = false;
  private completed = false;
  private laneCursor = 0;

  get wave(): number { return this.waveNumber; }
  get isComplete(): boolean { return this.completed; }
  get isBossWave(): boolean { return this.waveNumber === 10; }

  update(deltaMs: number, bossAlive: boolean): SpawnRequest[] {
    if (this.completed) return [];

    if (this.waveNumber === 10) {
      if (!this.bossSpawned) {
        this.bossSpawned = true;
        return [{ kind: 'boss', laneIndex: 2 }];
      }
      if (!bossAlive) this.completed = true;
      return [];
    }

    const requests: SpawnRequest[] = [];
    const composition = TEST_WAVE_COMPOSITIONS[this.waveNumber - 1];
    const targetCount = composition.infantry + composition.heavy;
    const spawnInterval = WAVE_SPAWN_WINDOW_MS / targetCount;
    this.waveElapsedMs += deltaMs;

    while (
      this.spawnedThisWave < targetCount &&
      this.spawnedThisWave * spawnInterval <= Math.min(this.waveElapsedMs, WAVE_SPAWN_WINDOW_MS)
    ) {
      const kind = this.pickSpawnKind(composition.infantry, composition.heavy, targetCount);
      requests.push({ kind, laneIndex: this.laneCursor % 5 });
      if (kind === 'heavy') this.spawnedHeavyThisWave += 1;
      this.laneCursor += 1;
      this.spawnedThisWave += 1;
    }

    if (this.waveElapsedMs >= WAVE_DURATION_MS) {
      this.waveNumber += 1;
      this.waveElapsedMs -= WAVE_DURATION_MS;
      this.spawnedThisWave = 0;
      this.spawnedHeavyThisWave = 0;
    }

    return requests;
  }

  private pickSpawnKind(infantry: number, heavy: number, targetCount: number): EnemyKind {
    if (heavy <= 0 || this.spawnedHeavyThisWave >= heavy) return 'infantry';

    const remainingSlots = targetCount - this.spawnedThisWave;
    const remainingHeavy = heavy - this.spawnedHeavyThisWave;
    if (remainingSlots <= remainingHeavy) return 'heavy';

    const nextHeavyThreshold = Math.round(
      ((this.spawnedHeavyThisWave + 1) * targetCount) / (heavy + 1),
    );
    if (this.spawnedThisWave + 1 >= nextHeavyThreshold) return 'heavy';

    const spawnedInfantry = this.spawnedThisWave - this.spawnedHeavyThisWave;
    return spawnedInfantry >= infantry ? 'heavy' : 'infantry';
  }
}
