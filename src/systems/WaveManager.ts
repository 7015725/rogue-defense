import {
  WAVE_DURATION_MS,
  WAVE_SPAWN_WINDOW_MS,
} from '../combat/constants';
import type { EnemyKind } from '../combat/types';
import { WaveDirector, type WaveComposition } from './WaveDirector';

export type SpawnRequest = { kind: EnemyKind; laneIndex: number };

type SpawnPlanEntry = SpawnRequest & { atMs: number };
type RandomSource = () => number;

export class WaveManager {
  private waveNumber: number;
  private waveElapsedMs = 0;
  private spawnedThisWave = 0;
  private bossSpawned = false;
  private checkpointClearRequested = false;
  private shopRequestedWave: number | null = null;
  private waitingForShop = false;
  private spawnPlanWave = 0;
  private spawnPlan: SpawnPlanEntry[] = [];
  private readonly runSeed: number;

  constructor(startWave = 1, seed?: number) {
    this.waveNumber = this.normalizeWave(startWave);
    this.runSeed = this.normalizeSeed(seed ?? Math.floor(Math.random() * 0x1_0000_0000));
    WaveDirector.setActiveSpawnWave(this.waveNumber);
  }

  get wave(): number { return this.waveNumber; }
  get isComplete(): boolean { return false; }
  get isBossWave(): boolean { return this.waveNumber % 10 === 0; }
  get isReinforcedWave(): boolean {
    return !this.isBossWave && WaveDirector.getRegularComposition(this.waveNumber).reinforced;
  }
  get shopPending(): boolean { return this.waitingForShop; }
  get populationBudget(): number {
    return this.isBossWave ? 0 : WaveDirector.getRegularComposition(this.waveNumber).populationBudget;
  }

  update(deltaMs: number, bossAlive: boolean): SpawnRequest[] {
    if (this.waitingForShop) return [];

    WaveDirector.setActiveSpawnWave(this.waveNumber);
    if (this.isBossWave) return this.updateBossWave(bossAlive);

    const composition = WaveDirector.getRegularComposition(this.waveNumber);
    this.ensureSpawnPlan(composition);
    const requests: SpawnRequest[] = [];
    this.waveElapsedMs += deltaMs;
    const spawnCutoffMs = Math.min(this.waveElapsedMs, WAVE_SPAWN_WINDOW_MS);

    while (
      this.spawnedThisWave < this.spawnPlan.length
      && this.spawnPlan[this.spawnedThisWave].atMs <= spawnCutoffMs
    ) {
      const entry = this.spawnPlan[this.spawnedThisWave];
      requests.push({ kind: entry.kind, laneIndex: entry.laneIndex });
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
    this.waveNumber += 1;
    this.waveElapsedMs = 0;
    this.bossSpawned = false;
    this.resetRegularWaveCounters();
    WaveDirector.setActiveSpawnWave(this.waveNumber);
  }

  debugJumpToWave(wave: number): void {
    this.waveNumber = this.normalizeWave(wave);
    this.waveElapsedMs = 0;
    this.bossSpawned = false;
    this.checkpointClearRequested = false;
    this.shopRequestedWave = null;
    this.waitingForShop = false;
    this.resetRegularWaveCounters();
    WaveDirector.setActiveSpawnWave(this.waveNumber);
  }

  private updateBossWave(bossAlive: boolean): SpawnRequest[] {
    if (!this.bossSpawned) {
      this.bossSpawned = true;
      const requests: SpawnRequest[] = [{ kind: 'boss', laneIndex: 2 }];
      const escortCount = WaveDirector.getBossEscortCount(this.waveNumber);
      const random = this.createWaveRandom(this.waveNumber + 100_000);
      let previousLane = 2;

      for (let index = 0; index < escortCount; index += 1) {
        const laneIndex = this.pickLane(random, previousLane);
        requests.push({ kind: 'flying', laneIndex });
        previousLane = laneIndex;
      }
      return requests;
    }

    if (bossAlive) return [];

    this.checkpointClearRequested = true;
    this.waitingForShop = true;
    this.shopRequestedWave = this.waveNumber;
    return [];
  }

  private ensureSpawnPlan(composition: WaveComposition): void {
    const targetCount = composition.infantry + composition.heavy + composition.flying;
    if (this.spawnPlanWave === this.waveNumber && this.spawnPlan.length === targetCount) return;

    const random = this.createWaveRandom(this.waveNumber);
    const kinds: EnemyKind[] = [];
    for (let index = 0; index < composition.infantry; index += 1) kinds.push('infantry');
    for (let index = 0; index < composition.heavy; index += 1) kinds.push('heavy');
    for (let index = 0; index < composition.flying; index += 1) kinds.push('flying');
    this.shuffle(kinds, random);

    const baseIntervalMs = WAVE_SPAWN_WINDOW_MS / Math.max(1, targetCount);
    const minimumGapMs = Math.min(baseIntervalMs, Math.max(6, baseIntervalMs * 0.18));
    let previousAtMs = 0;
    let previousLane = -1;

    this.spawnPlan = kinds.map((kind, index) => {
      let atMs = 0;
      if (index > 0) {
        const nominalAtMs = index * baseIntervalMs;
        const jitterMs = (random() - 0.5) * baseIntervalMs * 1.5;
        const remaining = targetCount - index - 1;
        const latestAtMs = WAVE_SPAWN_WINDOW_MS - remaining * minimumGapMs;
        atMs = Math.min(
          latestAtMs,
          Math.max(previousAtMs + minimumGapMs, nominalAtMs + jitterMs),
        );
      }

      const laneIndex = this.pickLane(random, previousLane);
      previousAtMs = atMs;
      previousLane = laneIndex;
      return { kind, laneIndex, atMs };
    });
    this.spawnPlanWave = this.waveNumber;
  }

  private pickLane(random: RandomSource, previousLane: number): number {
    const candidates = [0, 1, 2, 3, 4].filter((lane) => lane !== previousLane);
    return candidates[Math.floor(random() * candidates.length)] ?? 2;
  }

  private shuffle<T>(values: T[], random: RandomSource): void {
    for (let index = values.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
    }
  }

  private createWaveRandom(wave: number): RandomSource {
    let state = (this.runSeed ^ Math.imul(Math.floor(wave), 0x9e3779b1)) >>> 0;
    return () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000;
    };
  }

  private resetRegularWaveCounters(): void {
    this.spawnedThisWave = 0;
    this.spawnPlanWave = 0;
    this.spawnPlan = [];
  }

  private normalizeWave(wave: number): number {
    if (!Number.isFinite(wave)) return 1;
    return Math.max(1, Math.min(9999, Math.floor(wave)));
  }

  private normalizeSeed(seed: number): number {
    if (!Number.isFinite(seed)) return 1;
    return Math.floor(seed) >>> 0;
  }
}
