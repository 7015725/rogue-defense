import * as Phaser from 'phaser';

interface CombatHudProbe {
  waveManager?: {
    wave: number;
    isBossWave: boolean;
    isReinforcedWave: boolean;
    populationBudget: number;
  };
  enemies?: Array<{ kind?: string; domain?: string }>;
  projectilePool?: { activeCount: number; size: number };
  weapons?: unknown[];
  activeCombos?: Set<unknown>;
  gameSpeed?: number;
  maxGameSpeed?: number;
  kills?: number;
  bossKills?: number;
  debugRun?: boolean;
  debugStartWave?: number;
  debugStressCount?: number;
}

const COMPACT_DEBUG_REFRESH_MS = 250;

function findText(scene: Phaser.Scene, predicate: (value: string) => boolean): Phaser.GameObjects.Text | null {
  for (const child of scene.children.list) {
    if (!(child instanceof Phaser.GameObjects.Text)) continue;
    if (predicate(child.text)) return child;
  }
  return null;
}

function hideBattlefieldLabels(scene: Phaser.Scene): void {
  for (const child of scene.children.list) {
    if (!(child instanceof Phaser.GameObjects.Text)) continue;
    if (child.text === 'AIR PATH · W20+' || child.text === 'BASE ATTACK LINE') child.setVisible(false);
  }
}

function restyleBottomHud(scene: Phaser.Scene): void {
  const baseText = findText(scene, (text) => text.startsWith('Base HP'));
  const weaponText = findText(scene, (text) => text.startsWith('S1 '));
  if (!baseText || !weaponText) return;

  const panel = scene.add.rectangle(500, 1260, 940, 190, 0x020617, 0.76)
    .setStrokeStyle(2, 0x334155, 0.9)
    .setDepth(14);

  baseText
    .setPosition(42, 1180)
    .setFontSize(24)
    .setColor('#f8fafc')
    .setDepth(15);

  weaponText
    .setPosition(42, 1222)
    .setFontSize(18)
    .setLineSpacing(5)
    .setColor('#cbd5e1')
    .setDepth(15);

  panel.setVisible(true);
}

function installCompactDebug(scene: Phaser.Scene): void {
  const source = findText(scene, (text) => text.includes('Speed ') && text.includes('Projectiles '));
  source?.setVisible(false);

  const compact = scene.add.text(962, 390, '', {
    fontFamily: 'monospace',
    fontSize: '16px',
    color: '#cbd5e1',
    align: 'right',
    backgroundColor: '#020617cc',
    padding: { x: 8, y: 6 },
  }).setOrigin(1, 0).setDepth(15);

  const update = (): void => {
    const combat = scene as unknown as CombatHudProbe;
    const wave = combat.waveManager?.wave ?? 1;
    const enemyCount = combat.enemies?.length ?? 0;
    const heavyCount = combat.enemies?.filter((enemy) => enemy.kind === 'heavy').length ?? 0;
    const airCount = combat.enemies?.filter((enemy) => enemy.domain === 'AIR').length ?? 0;
    const waveKind = combat.waveManager?.isBossWave
      ? 'BOSS'
      : combat.waveManager?.isReinforcedWave
        ? 'REINF'
        : `B${combat.waveManager?.populationBudget ?? 0}`;
    const devLabel = combat.debugRun
      ? `DEV W${combat.debugStartWave ?? wave}${(combat.debugStressCount ?? 0) > 0 ? ` +${combat.debugStressCount}` : ''}`
      : null;

    compact.setText([
      `${combat.gameSpeed ?? 1}×/${combat.maxGameSpeed ?? 1}× · FPS ${Math.round(scene.game.loop.actualFps)}`,
      `W${wave} ${waveKind} · E${enemyCount} H${heavyCount} A${airCount}`,
      `K${combat.kills ?? 0} B${combat.bossKills ?? 0} · WPN ${combat.weapons?.length ?? 0}/5`,
      `PROJ ${combat.projectilePool?.activeCount ?? 0}/${combat.projectilePool?.size ?? 0} · C${combat.activeCombos?.size ?? 0}/4`,
      devLabel,
    ].filter((line): line is string => line !== null));
  };

  update();
  scene.time.addEvent({ delay: COMPACT_DEBUG_REFRESH_MS, loop: true, callback: update });
}

function applyCombatMobileLayout(scene: Phaser.Scene): void {
  hideBattlefieldLabels(scene);
  restyleBottomHud(scene);
  installCompactDebug(scene);
}

export function installCombatMobileLayout(game: Phaser.Game): void {
  game.events.once(Phaser.Core.Events.READY, () => {
    const combat = game.scene.getScene('CombatScene');
    combat.events.on(Phaser.Scenes.Events.CREATE, () => {
      combat.time.delayedCall(0, () => applyCombatMobileLayout(combat));
    });
  });
}
