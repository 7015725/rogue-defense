export interface RunTelemetrySnapshot {
  earlyWaveCount: number;
  earlyWaveCredits: number;
  weaponLoadout: string[];
  comboCount: number;
  estimatedDps: number;
  bossWave: number;
  bossMaxHp: number;
  bossRemainingHp: number;
  bossDamageDealt: number;
  bossFightSeconds: number;
  bossActualDps: number;
}

export interface BossCombatTelemetry {
  wave: number;
  maxHp: number;
  remainingHp: number;
  damageDealt: number;
  fightSeconds: number;
}

let current: RunTelemetrySnapshot = createEmptySnapshot();

function createEmptySnapshot(): RunTelemetrySnapshot {
  return {
    earlyWaveCount: 0,
    earlyWaveCredits: 0,
    weaponLoadout: [],
    comboCount: 0,
    estimatedDps: 0,
    bossWave: 0,
    bossMaxHp: 0,
    bossRemainingHp: 0,
    bossDamageDealt: 0,
    bossFightSeconds: 0,
    bossActualDps: 0,
  };
}

export function resetRunTelemetry(): void {
  current = createEmptySnapshot();
}

export function recordEarlyWaveAdvance(credits: number): void {
  current.earlyWaveCount += 1;
  current.earlyWaveCredits += Math.max(0, Math.floor(credits));
}

export function recordBossCombat(snapshot: BossCombatTelemetry): void {
  const wave = Math.max(0, Math.floor(snapshot.wave));
  const maxHp = Math.max(0, snapshot.maxHp);
  const remainingHp = Math.max(0, Math.min(maxHp, snapshot.remainingHp));
  const damageDealt = Math.max(0, Math.min(maxHp, snapshot.damageDealt));
  const fightSeconds = Math.max(0, snapshot.fightSeconds);

  current.bossWave = wave;
  current.bossMaxHp = maxHp;
  current.bossRemainingHp = remainingHp;
  current.bossDamageDealt = damageDealt;
  current.bossFightSeconds = fightSeconds;
  current.bossActualDps = fightSeconds > 0 ? damageDealt / fightSeconds : 0;
}

export function updateRunTelemetry(
  patch: Pick<RunTelemetrySnapshot, 'weaponLoadout' | 'comboCount' | 'estimatedDps'>,
): void {
  current.weaponLoadout = [...patch.weaponLoadout];
  current.comboCount = Math.max(0, Math.floor(patch.comboCount));
  current.estimatedDps = Math.max(0, patch.estimatedDps);
}

export function getRunTelemetry(): RunTelemetrySnapshot {
  return {
    ...current,
    weaponLoadout: [...current.weaponLoadout],
  };
}
