import { TEST_WAVE_COUNTS, WAVE_DURATION_MS, WAVE_SPAWN_WINDOW_MS } from '../combat/constants';

export type SpawnRequest = { kind: 'infantry' | 'boss'; laneIndex: number };

export class WaveManager {
  private waveNumber = 1;
  private waveElapsedMs = 0;
  private spawnedThisWave = 0;
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
    const targetCount = TEST_WAVE_COUNTS[this.waveNumber - 1];
    const spawnInterval = WAVE_SPAWN_WINDOW_MS / targetCount;
    this.waveElapsedMs += deltaMs;

    while (
      this.spawnedThisWave < targetCount &&
      this.spawnedThisWave * spawnInterval <= Math.min(this.waveElapsedMs, WAVE_SPAWN_WINDOW_MS)
    ) {
      requests.push({ kind: 'infantry', laneIndex: this.laneCursor % 5 });
      this.laneCursor += 1;
      this.spawnedThisWave += 1;
    }

    if (this.waveElapsedMs >= WAVE_DURATION_MS) {
      this.waveNumber += 1;
      this.waveElapsedMs -= WAVE_DURATION_MS;
      this.spawnedThisWave = 0;
    }

    return requests;
  }
}
