import {
  TEST_WAVE_COMPOSITIONS,
  WAVE20_AIR_ESCORT_COUNT,
  WAVE30_AIR_ESCORT_COUNT,
  WAVE_DURATION_MS,
  WAVE_SPAWN_WINDOW_MS,
} from '../combat/constants';
import type { EnemyKind } from '../combat/types';

export type SpawnRequest = { kind: EnemyKind; laneIndex: number };

interface WaveComposition {
  readonly infantry: number;
  readonly heavy: number;
  readonly flying: number;
}

export class WaveManager {
  private waveNumber = 1;
  private waveElapsedMs = 0;
  private spawnedThisWave = 0;
  private spawnedHeavyThisWave = 0;
  private spawnedFlyingThisWave = 0;
  private bossSpawned = false;
  private completed = false;
  private checkpointClearRequested = false;
  private shopRequestedWave: number | null = null;
  private waitingForShop = false;
  private laneCursor = 0;

  get wave(): number { return this.waveNumber; }
  get isComplete(): boolean { return this.completed; }
  get isBossWave(): boolean { return this.waveNumber % 10 === 0 && this.waveNumber <= 30; }
  get shopPending(): boolean { return this.waitingForShop; }

  update(deltaMs: number, bossAlive: boolean): SpawnRequest[] {
    if (this.completed || this.waitingForShop) return [];

    if (this.isBossWave) return this.updateBossWave(bossAlive);

    const composition = TEST_WAVE_COMPOSITIONS[this.waveNumber - 1];
    if (!composition) return [];

    const requests: SpawnRequest[] = [];
    const targetCount = composition.infantry + composition.heavy + composition.flying;
    const spawnInterval = WAVE_SPAWN_WINDOW_MS / Math.max(1, targetCount);
    this.waveElapsedMs += deltaMs;

    while (
      this.spawnedThisWave < targetCount &&
      this.spawnedThisWave * spawnInterval <= Math.min(this.waveElapsedMs, WAVE_SPAWN_WINDOW_MS)
    ) {
      const kind = this.pickSpawnKind(composition, targetCount);
      requests.push({ kind, laneIndex: this.laneCursor % 5 });
      if (kind === 'heavy') this.spawnedHeavyThisWave += 1;
      if (kind === 'flying') this.spawnedFlyingThisWave += 1;
      this.laneCursor += 1;
      this.spawnedThisWave += 1;
    }

    if (this.waveElapsedMs >= WAVE_DURATION_MS) {
      this.waveNumber += 1;
      this.waveElapsedMs -= WAVE_DURATION_MS;
      this.resetRegularWaveCounters();
    }

    return requests;
  }

  consumeCheckpointClearRequested(): boolean {
    const requested = this.checkpointClearRequested;
    this.checkpointClearRequested = false;
    return requested;
  }

  consumeShopRequested(): number | null {
    const wave = this.shopRequestedWave;
    this.shopRequestedWave = null;
    return wave;
  }

  resumeAfterShop(): void {
    if (!this.waitingForShop) return;
    this.waitingForShop = false;

    if (this.waveNumber >= 30) {
      this.completed = true;
      return;
    }

    this.waveNumber += 1;
    this.waveElapsedMs = 0;
    this.bossSpawned = false;
    this.resetRegularWaveCounters();
  }

  private updateBossWave(bossAlive: boolean): SpawnRequest[] {
    if (!this.bossSpawned) {
      this.bossSpawned = true;
      const requests: SpawnRequest[] = [{ kind: 'boss', laneIndex: 2 }];
      const escortCount = this.waveNumber === 20
        ? WAVE20_AIR_ESCORT_COUNT
        : this.waveNumber === 30
          ? WAVE30_AIR_ESCORT_COUNT
          : 0;

      for (let index = 0; index < escortCount; index += 1) {
        requests.push({ kind: 'flying', laneIndex: index % 5 });
      }
      return requests;
    }

    if (bossAlive) return [];

    this.checkpointClearRequested = true;
    this.waitingForShop = true;
    this.shopRequestedWave = this.waveNumber;
    return [];
  }

  private pickSpawnKind(composition: WaveComposition, targetCount: number): EnemyKind {
    if (composition.flying > 0 && this.spawnedFlyingThisWave < composition.flying) {
      const nextFlyingThreshold = Math.round(
        ((this.spawnedFlyingThisWave + 1) * targetCount) / (composition.flying + 1),
      );
      if (this.spawnedThisWave + 1 >= nextFlyingThreshold) return 'flying';
    }

    if (composition.heavy > 0 && this.spawnedHeavyThisWave < composition.heavy) {
      const nextHeavyThreshold = Math.round(
        ((this.spawnedHeavyThisWave + 1) * targetCount) / (composition.heavy + 1),
      );
      if (this.spawnedThisWave + 1 >= nextHeavyThreshold) return 'heavy';
    }

    const spawnedInfantry = this.spawnedThisWave - this.spawnedHeavyThisWave - this.spawnedFlyingThisWave;
    if (spawnedInfantry < composition.infantry) return 'infantry';
    if (this.spawnedHeavyThisWave < composition.heavy) return 'heavy';
    if (this.spawnedFlyingThisWave < composition.flying) return 'flying';
    return 'infantry';
  }

  private resetRegularWaveCounters(): void {
    this.spawnedThisWave = 0;
    this.spawnedHeavyThisWave = 0;
    this.spawnedFlyingThisWave = 0;
  }
}
