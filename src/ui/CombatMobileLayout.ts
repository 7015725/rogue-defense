import * as Phaser from 'phaser';
import {
  recordEarlyWaveAdvance,
  resetRunTelemetry,
  updateRunTelemetry,
} from '../run/RunTelemetry';

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
  difficultyId?: number;
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
    level: number;
    xp: number;
    xpToNextLevel: number;
    xpGainMultiplier: number;
    credits: number;
    rerollCharges: number;
    addCredits: (amount: number) => void;
  };
  base?: {
    currentHp: number;
    maxHp: number;
    damageReduction: number;
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
  finishRun?: (reason: 'VOLUNTARY_EXIT') => void;
}

const HUD_REFRESH_MS = 250;
const PLAYTEST_SPEEDS = [1, 3, 5, 7, 9] as const;
const TOP_PANEL_WIDTH = 964;
const TOP_PANEL_HEIGHT = 132;
const TOP_PANEL_CENTER_Y = 76;
const ACTION_Y = 111;
const BOTTOM_BAR_WIDTH = 964;
const BOTTOM_BAR_HEIGHT = 58;
const BOTTOM_BAR_Y = 1564;
const MAX_WEAPON_DETAILS = 5;

function findText(scene: Phaser.Scene, predicate: (value: string) => boolean): Phaser.GameObjects.Text | null {
  for (const child of scene.children.list) {
    if (!(child instanceof Phaser.GameObjects.Text)) continue;
    if (predicate(child.text)) return child;
  }
  return null;
}

function hideLegacyHud(scene: Phaser.Scene): void {
  const legacyTextPositions = [
    [36, 138], [36, 178], [36, 218], [36, 258],
    [36, 1335], [36, 1375], [964, 36], [870, 330],
  ] as const;
  const hiddenPrefixes = ['Difficulty ', 'Enemies ', 'Run Lv ', 'Credits ', 'Base HP ', 'S1 '];

  for (const child of scene.children.list) {
    if (child instanceof Phaser.GameObjects.Text) {
      const atLegacyPosition = legacyTextPositions.some(([x, y]) => Math.abs(child.x - x) < 3 && Math.abs(child.y - y) < 3);
      const shouldHide = atLegacyPosition
        || hiddenPrefixes.some((prefix) => child.text.startsWith(prefix))
        || child.text === 'ENEMY SPAWN'
        || child.text === 'AIR PATH · W20+'
        || child.text === 'BASE ATTACK LINE'
        || child.text === '结束本局 [E]'
        || (child.text.includes('Speed ') && child.text.includes('Projectiles '));
      if (shouldHide) child.disableInteractive().setVisible(false);
      continue;
    }

    if (
      child instanceof Phaser.GameObjects.Rectangle
      && Math.abs(child.x - 870) < 3
      && Math.abs(child.y - 330) < 3
    ) {
      child.disableInteractive().setVisible(false);
    }
  }
}

function keepLegacyHudHidden(scene: Phaser.Scene): void {
  const sourceBaseText = findText(scene, (text) => text.startsWith('Base HP'));
  const sourceWeaponText = findText(scene, (text) => text.startsWith('S1 '));
  sourceBaseText?.setVisible(false);
  sourceWeaponText?.setVisible(false);
}

function getDifficultyLabel(id: number): string {
  return ['I', 'II', 'III', 'IV', 'V'][Math.max(0, Math.min(4, Math.floor(id) - 1))] ?? 'I';
}

function installTopStatus(scene: Phaser.Scene): void {
  const combat = scene as unknown as CombatHudProbe;

  scene.add.rectangle(500, TOP_PANEL_CENTER_Y, TOP_PANEL_WIDTH, TOP_PANEL_HEIGHT, 0x020617, 0.76)
    .setStrokeStyle(2, 0x334155, 0.82)
    .setDepth(14);
  scene.add.rectangle(500, 77, 930, 1, 0x475569, 0.55).setDepth(15);

  const primaryLeft = scene.add.text(40, 20, '', {
    fontFamily: 'monospace', fontSize: '24px', color: '#f8fafc', fontStyle: 'bold',
  }).setDepth(16);
  const primaryRight = scene.add.text(960, 20, '', {
    fontFamily: 'monospace', fontSize: '19px', color: '#cbd5e1', align: 'right',
  }).setOrigin(1, 0).setDepth(16);
  const secondaryLeft = scene.add.text(40, 52, '', {
    fontFamily: 'monospace', fontSize: '17px', color: '#cbd5e1',
  }).setDepth(16);
  const secondaryRight = scene.add.text(960, 52, '', {
    fontFamily: 'monospace', fontSize: '17px', color: '#94a3b8', align: 'right',
  }).setOrigin(1, 0).setDepth(16);

  const update = (): void => {
    const manager = combat.waveManager;
    const run = combat.runState;
    if (!manager || !run) return;

    const enemies = combat.enemies ?? [];
    const heavyCount = enemies.filter((enemy) => enemy.kind === 'heavy').length;
    const airCount = enemies.filter((enemy) => enemy.domain === 'AIR').length;
    const waveKind = manager.isBossWave
      ? 'BOSS'
      : manager.isCheckpointWave
        ? '关卡'
        : manager.isReinforcedWave
          ? '精英'
          : '普通';

    primaryLeft.setText(`难度 ${getDifficultyLabel(combat.difficultyId ?? 1)} · W${manager.wave} · ${waveKind}`);
    primaryRight.setText(`敌 ${enemies.length} · 币 ${run.credits} · 重抽 ${run.rerollCharges}`);
    secondaryLeft.setText(`Lv${run.level} · EXP ${run.xp}/${run.xpToNextLevel} · XP×${run.xpGainMultiplier.toFixed(2)}`);
    secondaryRight.setText(`${heavyCount > 0 ? `重甲 ${heavyCount}` : ''}${heavyCount > 0 && airCount > 0 ? ' · ' : ''}${airCount > 0 ? `空中 ${airCount}` : ''}`);
  };

  update();
  scene.time.addEvent({ delay: HUD_REFRESH_MS, loop: true, callback: update });
}

function installPlaytestSpeedControls(scene: Phaser.Scene): void {
  const combat = scene as unknown as CombatHudProbe;

  for (const item of combat.speedButtons ?? []) {
    item.button.disableInteractive().setVisible(false);
    item.text.disableInteractive().setVisible(false);
  }

  const controls = PLAYTEST_SPEEDS.map((speed, index) => {
    const x = 46 + index * 52;
    const button = scene.add.rectangle(x, ACTION_Y, 48, 38, 0x1f2937, 0.88)
      .setStrokeStyle(1, 0x64748b)
      .setInteractive({ useHandCursor: true })
      .setDepth(16);
    const text = scene.add.text(x, ACTION_Y, `${speed}×`, {
      fontFamily: 'monospace', fontSize: '15px', color: '#e2e8f0', fontStyle: 'bold',
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
    const maxSpeed = combat.maxGameSpeed ?? 1;
    for (const item of controls) {
      const locked = item.speed > maxSpeed;
      const active = item.speed === activeSpeed;
      item.button.setFillStyle(active ? 0x1d4ed8 : locked ? 0x0f172a : 0x1f2937, active ? 0.96 : 0.82);
      item.button.setStrokeStyle(1, active ? 0x93c5fd : locked ? 0x334155 : 0x64748b);
      item.text.setColor(locked ? '#475569' : active ? '#eff6ff' : '#e2e8f0');
    }
  };

  const keyboard = scene.input.keyboard;
  keyboard?.on('keydown-ONE', () => { combat.setGameSpeed?.(1); refresh(); });
  keyboard?.on('keydown-THREE', () => { combat.setGameSpeed?.(3); refresh(); });
  keyboard?.on('keydown-FIVE', () => { combat.setGameSpeed?.(5); refresh(); });
  keyboard?.on('keydown-SEVEN', () => { combat.setGameSpeed?.(7); refresh(); });
  keyboard?.on('keydown-NINE', () => { combat.setGameSpeed?.(9); refresh(); });

  refresh();
  scene.time.addEvent({ delay: HUD_REFRESH_MS, loop: true, callback: refresh });
}

function installEarlyWaveControl(scene: Phaser.Scene): void {
  const combat = scene as unknown as CombatHudProbe;
  const x = 465;
  const button = scene.add.rectangle(x, ACTION_Y, 300, 38, 0x111827, 0.86)
    .setStrokeStyle(1, 0x334155)
    .setInteractive({ useHandCursor: true })
    .setDepth(16);
  const text = scene.add.text(x, ACTION_Y, '提前开波', {
    fontFamily: 'monospace', fontSize: '15px', color: '#64748b', fontStyle: 'bold',
  }).setOrigin(0.5).setDepth(17);

  const trigger = (): void => {
    if (combat.isChoicePaused?.()) return;
    const manager = combat.waveManager;
    if (!manager?.canAdvanceEarly) return;
    const bonus = manager.advanceEarly(combat.enemies?.length ?? 0);
    if (bonus <= 0) return;
    combat.runState?.addCredits(bonus);
    recordEarlyWaveAdvance(bonus);
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
      button.setFillStyle(0x78350f, 0.92).setStrokeStyle(1, 0xf59e0b);
      text.setColor('#fde68a').setText(`▶ 提前 W${manager.wave + 1} · +${bonus}`);
      return;
    }

    button.setFillStyle(0x111827, 0.76).setStrokeStyle(1, 0x334155);
    text.setColor('#64748b');
    if (manager.isBossWave) text.setText('BOSS 波不可提前');
    else if (manager.isCheckpointWave) text.setText(`W${manager.wave} 关卡结算`);
    else text.setText('提前开波');
  };

  button.on('pointerup', trigger);
  text.setInteractive({ useHandCursor: true }).on('pointerup', trigger);
  scene.input.keyboard?.on('keydown-N', trigger);

  refresh();
  scene.time.addEvent({ delay: HUD_REFRESH_MS, loop: true, callback: refresh });
}

function installEndControl(scene: Phaser.Scene): void {
  const combat = scene as unknown as CombatHudProbe;
  const x = 922;
  const button = scene.add.rectangle(x, ACTION_Y, 112, 38, 0x334155, 0.76)
    .setStrokeStyle(1, 0x64748b)
    .setInteractive({ useHandCursor: true })
    .setDepth(16);
  const text = scene.add.text(x, ACTION_Y, '结束', {
    fontFamily: 'monospace', fontSize: '15px', color: '#cbd5e1', fontStyle: 'bold',
  }).setOrigin(0.5).setDepth(17);

  const trigger = (): void => combat.finishRun?.('VOLUNTARY_EXIT');
  button.on('pointerup', trigger);
  text.setInteractive({ useHandCursor: true }).on('pointerup', trigger);
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

function compactWeaponName(name: string, maxLength: number): string {
  return name.length <= maxLength ? name : `${name.slice(0, Math.max(1, maxLength - 1))}…`;
}

function installBottomHud(scene: Phaser.Scene): void {
  const combat = scene as unknown as CombatHudProbe;
  keepLegacyHudHidden(scene);

  scene.add.rectangle(500, BOTTOM_BAR_Y, BOTTOM_BAR_WIDTH, BOTTOM_BAR_HEIGHT, 0x020617, 0.72)
    .setStrokeStyle(1, 0x334155, 0.78)
    .setDepth(14);

  const baseLabel = scene.add.text(32, BOTTOM_BAR_Y - 18, '', {
    fontFamily: 'monospace', fontSize: '15px', color: '#f8fafc', fontStyle: 'bold',
  }).setDepth(16);
  const weaponSummary = scene.add.text(286, BOTTOM_BAR_Y - 18, '', {
    fontFamily: 'monospace', fontSize: '14px', color: '#cbd5e1',
  }).setDepth(16);
  const loadoutLabel = scene.add.text(848, BOTTOM_BAR_Y - 18, '', {
    fontFamily: 'monospace', fontSize: '13px', color: '#94a3b8', align: 'right',
  }).setOrigin(1, 0).setDepth(16);

  const hpBarX = 32;
  const hpBarY = BOTTOM_BAR_Y + 13;
  const hpBarWidth = 220;
  scene.add.rectangle(hpBarX, hpBarY, hpBarWidth, 7, 0x0f172a, 0.9)
    .setOrigin(0, 0.5)
    .setStrokeStyle(1, 0x475569)
    .setDepth(15);
  const hpFill = scene.add.rectangle(hpBarX, hpBarY, hpBarWidth, 5, 0x94a3b8)
    .setOrigin(0, 0.5)
    .setDepth(16);

  const detailsButton = scene.add.rectangle(932, BOTTOM_BAR_Y + 11, 82, 28, 0x1e293b, 0.88)
    .setStrokeStyle(1, 0x64748b)
    .setInteractive({ useHandCursor: true })
    .setDepth(16);
  const detailsButtonText = scene.add.text(932, BOTTOM_BAR_Y + 11, '详情⌃', {
    fontFamily: 'monospace', fontSize: '13px', color: '#cbd5e1', fontStyle: 'bold',
  }).setOrigin(0.5).setDepth(17);

  const detailsPanel = scene.add.rectangle(500, 1460, 930, 150, 0x020617, 0.92)
    .setStrokeStyle(1, 0x475569, 0.9)
    .setDepth(18)
    .setVisible(false);
  const detailsText = scene.add.text(48, 1394, '', {
    fontFamily: 'monospace', fontSize: '15px', color: '#cbd5e1', lineSpacing: 5,
  }).setDepth(19).setVisible(false);

  let detailsVisible = false;
  const setDetailsVisible = (visible: boolean): void => {
    detailsVisible = visible;
    detailsPanel.setVisible(visible);
    detailsText.setVisible(visible);
    detailsButtonText.setText(visible ? '收起⌄' : '详情⌃');
  };
  const toggleDetails = (): void => setDetailsVisible(!detailsVisible);
  detailsButton.on('pointerup', toggleDetails);
  detailsButtonText.setInteractive({ useHandCursor: true }).on('pointerup', toggleDetails);

  const update = (): void => {
    keepLegacyHudHidden(scene);
    const weapons = combat.weapons ?? [];
    const base = combat.base;
    let totalDps = 0;

    if (base) {
      const ratio = Phaser.Math.Clamp(base.currentHp / Math.max(1, base.maxHp), 0, 1);
      baseLabel.setText(`基地 ${Math.ceil(base.currentHp)}/${base.maxHp} · DR ${Math.round(base.damageReduction * 100)}%`);
      hpFill.setDisplaySize(Math.max(1, hpBarWidth * ratio), 5);
    }

    const primaryWeapon = weapons[0];
    if (primaryWeapon) {
      const dps = estimateSustainedDps(primaryWeapon);
      const dpsLabel = dps === null ? '—' : Math.round(dps).toString();
      weaponSummary.setText(`S1 ${compactWeaponName(primaryWeapon.name, 14)} L${primaryWeapon.level} · DPS≈${dpsLabel} · 弹 ${primaryWeapon.ammoLabel} · ${primaryWeapon.currentState}`);
    } else {
      weaponSummary.setText('暂无武器');
    }
    loadoutLabel.setText(`武器 ${weapons.length}/5 · 协同 ${combat.activeCombos?.size ?? 0}`);

    const detailLines = weapons.slice(0, MAX_WEAPON_DETAILS).map((weapon, index) => {
      const dps = estimateSustainedDps(weapon);
      if (dps !== null) totalDps += dps;
      const dpsLabel = dps === null ? '—' : Math.round(dps).toString();
      const aa = weapon.canTargetAir ? ' · 对空' : '';
      return `S${index + 1} ${compactWeaponName(weapon.name, 18)} L${weapon.level}${aa} · DPS≈${dpsLabel} · HP ${Math.ceil(weapon.currentHp)}/${weapon.maxHp} · 弹 ${weapon.ammoLabel} · ${weapon.currentState}`;
    });

    const detailHeight = Math.min(180, 54 + Math.max(1, detailLines.length) * 26);
    const panelBottom = BOTTOM_BAR_Y - BOTTOM_BAR_HEIGHT / 2 - 8;
    const panelTop = panelBottom - detailHeight;
    detailsPanel
      .setPosition(500, panelTop + detailHeight / 2)
      .setDisplaySize(930, detailHeight);
    detailsText
      .setPosition(48, panelTop + 16)
      .setText(detailLines.length > 0 ? detailLines : ['暂无武器详情']);

    updateRunTelemetry({
      weaponLoadout: weapons.map((weapon) => `${weapon.name} L${weapon.level}`),
      comboCount: combat.activeCombos?.size ?? 0,
      estimatedDps: totalDps,
    });
  };

  update();
  scene.time.addEvent({ delay: HUD_REFRESH_MS, loop: true, callback: update });
}

function installCompactDebug(scene: Phaser.Scene): void {
  const combat = scene as unknown as CombatHudProbe;
  const explicitDevHud = new URLSearchParams(window.location.search).get('dev') === '1';
  if (!explicitDevHud && !combat.debugRun) return;

  const compact = scene.add.text(966, 150, '', {
    fontFamily: 'monospace',
    fontSize: '14px',
    color: '#e2e8f0',
    align: 'right',
    backgroundColor: '#020617b8',
    padding: { x: 7, y: 5 },
  }).setOrigin(1, 0).setDepth(15);

  const update = (): void => {
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
      : 'DEV';

    compact.setText([
      `${devLabel} · FPS ${Math.round(scene.game.loop.actualFps)}`,
      `W${wave} ${waveKind} · E${enemyCount} H${heavyCount} A${airCount}`,
      `P${combat.projectilePool?.activeCount ?? 0}/${combat.projectilePool?.size ?? 0} · K${combat.kills ?? 0} · B${combat.bossKills ?? 0}`,
    ]);
  };

  update();
  scene.time.addEvent({ delay: HUD_REFRESH_MS, loop: true, callback: update });
}

function applyCombatMobileLayout(scene: Phaser.Scene): void {
  resetRunTelemetry();
  hideLegacyHud(scene);
  installTopStatus(scene);
  installPlaytestSpeedControls(scene);
  installEarlyWaveControl(scene);
  installEndControl(scene);
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
