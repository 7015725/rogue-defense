import * as Phaser from 'phaser';
import './style.css';
import { BATTLEFIELD_HEIGHT, BATTLEFIELD_WIDTH } from './combat/constants';
import { isRuntimeProbeEnabled, publishRuntimeProbe } from './dev/RuntimeProbe';
import { CombatScene } from './scenes/CombatScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { SettlementScene } from './scenes/SettlementScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: BATTLEFIELD_WIDTH,
  height: BATTLEFIELD_HEIGHT,
  backgroundColor: '#0f172a',
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [MainMenuScene, CombatScene, SettlementScene],
};

const game = new Phaser.Game(config);

if (isRuntimeProbeEnabled()) {
  window.setInterval(() => {
    const active = game.scene.getScenes(true)[0];
    if (!active) return;

    if (active.scene.key === 'CombatScene') {
      const combat = active as unknown as {
        waveManager?: { wave: number };
        enemies?: unknown[];
        projectilePool?: { activeCount: number };
        debugRun?: boolean;
        debugStressCount?: number;
        debugStartWave?: number;
      };
      publishRuntimeProbe({
        scene: 'combat',
        wave: combat.waveManager?.wave,
        enemyCount: combat.enemies?.length,
        projectileCount: combat.projectilePool?.activeCount,
        devRun: combat.debugRun,
        stressCount: combat.debugStressCount,
        startWave: combat.debugStartWave,
      });
      return;
    }

    if (active.scene.key === 'SettlementScene') {
      publishRuntimeProbe({ scene: 'settlement' });
    }
    // MainMenuScene publishes its own detailed startWave/stress state on every render.
  }, 100);
}

const isLocalPreview = window.location.hostname === 'localhost'
  || window.location.hostname === '127.0.0.1';

if (import.meta.env.PROD && !isLocalPreview && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js').catch((error: unknown) => {
      console.warn('Service worker registration failed', error);
    });
  });
}
