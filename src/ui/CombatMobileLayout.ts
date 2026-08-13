import * as Phaser from 'phaser';

interface WeaponHudProbe {
  name: string;
  level: number;
  currentHp: number;
  maxHp: number;
  ammoLabel: string;
  currentState: string;
  canTargetAir: boolean;
  magazineSize: number;
  definition?: {
    critChance: number;
    critMultiplier: number;
    reloadTimeMs: number;
  };
  getDamage?: () => number;
  getAttackIntervalMs?: () => number;
}

interface SpeedButtonProbe {
  speed: number;
  button: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
}

interface CombatHudProbe {
  waveManager?: {
    wave: number;
    isBossWave: boolean;
    isCheckpointWave: boolean;
    isReinforcedWave: boolean;
    populationBudget: number;
    canAdvanceEarly: boolean;
    getEarlyAdvanceBonus: (activeEnemyCount: number) => number;
    advanceEarly: (activeEnemyCount: number) => number;
  };
  runState?: {
    credits: number;
    addCredits: (amount: number) => void;
  };
  enemies?: Array<{ kind?: string; domain?: string }>;
  projectilePool?: { activeCount: number; size: number };
  weapons?: WeaponHudProbe[];
  activeCombos?: Set<unknown>;
  speedButtons?: SpeedButtonProbe[];
  gameSpeed?: number;
  maxGameSpeed?: number;
  kills?: number;
  bossKills?: number;
  debugRun?: boolean;
  debugStartWave?: number;
  debugStressCount?: number;
  setGameSpeed?: (speed: number) => void;
  updateUi?: () => void;
  isChoicePaused?: () => boolean;
}

const COMPACT_HUD_REFRESH_MS = 250;
const BOTTOM_PANEL_RIGHT = 970;
const BOTTOM_PANEL_LEFT = 30;
const BOTTOM_PANEL_BOTTOM = 1355;
const PLAYTEST_SPEEDS = [1, 3, 5, 7, 9] as const;

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

function installPlaytestSpeedControls(scene: Phaser.Scene): void {
  const combat = scene as unknown as CombatHudProbe;

  for (const item of combat.speedButtons ?? []) {
    item.button.disableInteractive().setVisible(false);
    item.text.disableInteractive().setVisible(false);
  }

  const controls = PLAYTEST_SPEEDS.map((speed, index) => {
    const x = 64 + index * 82;
    const button = scene.add.rectangle(x, 330, 70, 58, 0x1f2937)
      .setStrokeStyle(2, 0x64748b)
      .setInteractive({ useHandCursor: true })
      .setDepth(16);
    const text = scene.add.text(x, 330, `${speed}×`, {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#e2e8f0',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(17);

    const select = (): void => {
      combat.setGameSpeed?.(speed);
      combat.updateUi?.();
      refresh();
    };
    button.on('pointerup', select);
    text.setInteractive({ useHandCursor: true }).on('pointerup', select);
    return { speed, button, text };
  });

  const refresh = (): void => {
    const activeSpeed = combat.gameSpeed ?? 1;
    for (const item of controls) {
      const active = item.speed === activeSpeed;
      item.button.setFillStyle(active ? 0x1d4ed8 : 0x1f2937);
      item.button.setStrokeStyle(2, active ? 0x93c5fd : 0x64748b);
      item.text.setColor(active ? '#eff6ff' : '#e2e8f0');
    }
  };

  const keyboard = scene.input.keyboard;
  keyboard?.on('keydown-ONE', () => { combat.setGameSpeed?.(1); refresh(); });
  keyboard?.on('keydown-THREE', () => { combat.setGameSpeed?.(3); refresh(); });
  keyboard?.on('keydown-FIVE', () => { combat.setGameSpeed?.(5); refresh(); });
  keyboard?.on('keydown-SEVEN', () => { combat.setGameSpeed?.(7); refresh(); });
  keyboard?.on('keydown-NINE', () => { combat.setGameSpeed?.(9); refresh(); });

  refresh();
  scene.time.addEvent({ delay: COMPACT_HUD_REFRESH_MS, loop: true, callback: refresh });
}

function installEarlyWaveControl(scene: Phaser.Scene): void {
  const combat = scene as unknown as CombatHudProbe;
  const x = 600;
  const y = 330;
  const button = scene.add.rectangle(x, y, 300, 58, 0x1f2937)
    .setStrokeStyle(2, 0x475569)
    .setInteractive({ useHandCursor: true })
    .setDepth(16);
  const text = scene.add.text(x, y, '出怪完成后可提前', {
    fontFamily: 'monospace',
    fontSize: '18px',
    color: '#64748b',
    fontStyle: 'bold',
  }).setOrigin(0.5).setDepth(17);

  const trigger = (): void => {
    if (combat.isChoicePaused?.()) return;
    const manager = combat.waveManager;
    if (!manager?.canAdvanceEarly) return;
    const bonus = manager.advanceEarly(combat.enemies?.length ?? 0);
    if (bonus <= 0) return;
    combat.runState?.addCredits(bonus);
    combat.updateUi?.();
    refresh();
  };

  const refresh = (): void => {
    const manager = combat.waveManager;
    if (!manager) return;
    const enemyCount = combat.enemies?.length ?? 0;
    const available = manager.canAdvanceEarly;
    const bonus = available ? manager.getEarlyAdvanceBonus(enemyCount) : 0;

    if (available) {
      button.setFillStyle(0x78350f).setStrokeStyle(2, 0xf59e0b);
      text.setColor('#fde68a').setText(`提前 W${manager.wave + 1} · +${bonus}C [N]`);
      return;
    }

    button.setFillStyle(0x111827).setStrokeStyle(2, 0x334155);
    text.setColor('#64748b');
    if (manager.isBossWave) text.setText('BOSS 波不可提前');
    else if (manager.isCheckpointWave) text.setText(`W${manager.wave} 关卡结算`);
    else text.setText('出怪完成后可提前');
  };

  button.on('pointerup', trigger);
  text.setInteractive({ useHandCursor: true }).on('pointerup', trigger);
  scene.input.keyboard?.on('keydown-N', trigger);

  refresh();
  scene.time.addEvent({ delay: COMPACT_HUD_REFRESH_MS, loop: true, callback: refresh });
}

function estimateSustainedDps(weapon: WeaponHudProbe): number | null {
  const damage = weapon.getDamage?.();
  const attackIntervalMs = weapon.getAttackIntervalMs?.();
  if (damage === undefined || attackIntervalMs === undefined || attackIntervalMs <= 0) return null;

  const critChance = Math.max(0, Math.min(1, weapon.definition?.critChance ?? 0));
  const critMultiplier = Math.max(1, weapon.definition?.critMultiplier ?? 1);
  const expectedDamage = damage * (1 + critChance * (critMultiplier - 1));
  const magazineSize = Math.max(0, weapon.magazineSize);

  if (magazineSize <= 0) return expectedDamage * (1000 / attackIntervalMs);

  const reloadTimeMs = Math.max(0, weapon.definition?.reloadTimeMs ?? 0);
  const cycleMs = magazineSize * attackIntervalMs + reloadTimeMs;
  if (cycleMs <= 0) return null;
  return expectedDamage * magazineSize * (1000 / cycleMs);
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
        const dps = estimateSustainedDps(weapon);
        const dpsLabel = dps === null ? '—' : Math.round(dps).toString();
        return `S${index + 1} ${weapon.name} L${weapon.level}${aa} · DPS≈${dpsLabel} · HP ${Math.ceil(weapon.currentHp)}/${weapon.maxHp} · A ${weapon.ammoLabel} · ${weapon.currentState}`;
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
      : combat.waveManager?.isCheckpointWave
        ? 'GATE'
        : combat.waveManager?.isReinforcedWave
          ? 'ELITE'
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
  installPlaytestSpeedControls(scene);
  installEarlyWaveControl(scene);
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
