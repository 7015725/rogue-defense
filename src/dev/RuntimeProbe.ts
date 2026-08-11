export interface RuntimeProbeState {
  scene: 'menu' | 'combat' | 'settlement';
  wave?: number;
  enemyCount?: number;
  projectileCount?: number;
  devRun?: boolean;
  stressCount?: number;
  startWave?: number;
}

export function isRuntimeProbeEnabled(): boolean {
  return import.meta.env.DEV
    || new URLSearchParams(window.location.search).get('dev') === '1';
}

export function publishRuntimeProbe(state: RuntimeProbeState): void {
  if (!isRuntimeProbeEnabled()) return;
  const app = document.getElementById('app');
  if (!app) return;

  const next: Record<string, string> = {
    scene: state.scene,
  };

  if (state.wave !== undefined) next.wave = String(state.wave);
  if (state.enemyCount !== undefined) next.enemyCount = String(state.enemyCount);
  if (state.projectileCount !== undefined) next.projectileCount = String(state.projectileCount);
  if (state.devRun !== undefined) next.devRun = state.devRun ? '1' : '0';
  if (state.stressCount !== undefined) next.stressCount = String(state.stressCount);
  if (state.startWave !== undefined) next.startWave = String(state.startWave);

  for (const key of Object.keys(app.dataset)) {
    if (!(key in next)) delete app.dataset[key];
  }

  for (const [key, value] of Object.entries(next)) {
    app.dataset[key] = value;
  }
}
