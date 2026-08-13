export interface RunTelemetrySnapshot {
  earlyWaveCount: number;
  earlyWaveCredits: number;
  weaponLoadout: string[];
  comboCount: number;
  estimatedDps: number;
}

let current: RunTelemetrySnapshot = createEmptySnapshot();

function createEmptySnapshot(): RunTelemetrySnapshot {
  return {
    earlyWaveCount: 0,
    earlyWaveCredits: 0,
    weaponLoadout: [],
    comboCount: 0,
    estimatedDps: 0,
  };
}

export function resetRunTelemetry(): void {
  current = createEmptySnapshot();
}

export function recordEarlyWaveAdvance(credits: number): void {
  current.earlyWaveCount += 1;
  current.earlyWaveCredits += Math.max(0, Math.floor(credits));
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
