import * as Phaser from 'phaser';

interface WeaponHudProbe {
  name: string;
  level: number;
  currentHp: number;
  maxHp: number;
  ammoLabel: string;
  currentState: string;
  canTargetAir: boolean;
}

interface CombatHudProbe {
  waveManager?: {
    wave: number;
    isBossWave: boolean;
    isReinforcedWave: boolean;
    populationBudget: number;
  };
  enemies?: Array<{ kind?: string; domain?: string }>;
  projectilePool?: { activeCount: number; size: number };
  weapons?: WeaponHudProbe[];
  activeCombos?: Set<unknown>;
  gameSpeed?: number;
  maxGameSpeed?: number;
  kills?: number;
  bossKills?: number;
  debugRun?: boolean;
  debugStartWave?: number;
  debugStressCount?: number;
}

const COMPACT_HUD_REFRESH_MS = 250;
const BOTTOM_PANEL_RIGHT = 970;
const BOTTOM_PANEL_LEFT = 30;
const BOTTOM_PANEL_BOTTOM = 1355;

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

function installBottomHud(scene: Phaser.Scene): void {
  const baseText = findText(scene, (text) => text.startsWith('Base HP'));
  const sourceWeaponText = findText(scene, (text) => text.startsWith('S1 '));
  if (!baseText || !sourceWeaponText) return;

  sourceWeaponText.setVisible(false);

  const panel = scene.add.rectangle(500, 1300, BOTTOM_PANEL_RIGHT - BOTTOM_PANEL_LEFT, 100, 0x020617, 0.78)
    .setStrokeStyle(2, 0x334155, 0.9)
    .setDepth(14);

  baseText
    .setFontSize(24)
    .setColor('#f8fafc')
    .setDepth(15);

  const compactWeaponText = scene.add.text(BOTTOM_PANEL_LEFT + 12, 1300, '', {
    fontFamily: 'monospace',
    fontSize: '20px',
    color: '#cbd5e1',
    lineSpacing: 4,
  }).setDepth(15);

  const update = (): void => {
    const combat = scene as unknown as CombatHudProbe;
    const weapons = combat.weapons ?? [];
    const weaponCount = Math.max(1, weapons.length);
    const panelHeight = Math.min(192, 72 + weaponCount * 24);
    const panelTop = BOTTOM_PANEL_BOTTOM - panelHeight;

    panel
      .setPosition(500, panelTop + panelHeight / 2)
      .setSize(BOTTOM_PANEL_RIGHT - BOTTOM_PANEL_LEFT, panelHeight)
      .setDisplaySize(BOTTOM_PANEL_RIGHT - BOTTOM_PANEL_LEFT, panelHeight);

    baseText.setPosition(BOTTOM_PANEL_LEFT + 12, panelTop + 12);
    compactWeaponText
      .setPosition(BOTTOM_PANEL_LEFT + 12, panelTop + 48)
      .setText(weapons.map((weapon, index) => {
        const aa = weapon.canTargetAir ? ' AA' : '';
        return `S${index + 1} ${weapon.name} L${weapon.level}${aa} · HP ${Math.ceil(weapon.currentHp)}/${weapon.maxHp} · A ${weapon.ammoLabel} · ${weapon.currentState}`;
      }));
  };

  update();
  scene.time.addEvent({ delay: COMPACT_HUD_REFRESH_MS, loop: true, callback: update });
}

function installCompactDebug(scene: Phaser.Scene): void {
  const source = findText(scene, (text) => text.includes('Speed ') && text.includes('Projectiles '));
  source?.setVisible(false);

  const compact = scene.add.text(962, 390, '', {
    fontFamily: 'monospace',
    fontSize: '18px',
    color: '#e2e8f0',
    align: 'right',
    backgroundColor: '#020617d9',
    padding: { x: 9, y: 7 },
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
      `FPS ${Math.round(scene.game.loop.actualFps)} · ${combat.gameSpeed ?? 1}×/${combat.maxGameSpeed ?? 1}×`,
      `W${wave} ${waveKind} · E${enemyCount} H${heavyCount} A${airCount}`,
      `WPN ${combat.weapons?.length ?? 0}/5 · P${combat.projectilePool?.activeCount ?? 0}/${combat.projectilePool?.size ?? 0} · C${combat.activeCombos?.size ?? 0}/4`,
      `K${combat.kills ?? 0} · B${combat.bossKills ?? 0}`,
      devLabel,
    ].filter((line): line is string => line !== null));
  };

  update();
  scene.time.addEvent({ delay: COMPACT_HUD_REFRESH_MS, loop: true, callback: update });
}

function applyCombatMobileLayout(scene: Phaser.Scene): void {
  hideBattlefieldLabels(scene);
  installBottomHud(scene);
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
