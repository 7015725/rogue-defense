import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const LOGICAL_WIDTH = 1000;
const LOGICAL_HEIGHT = 1600;

interface CombatSnapshot {
  scene: string;
  wave: number;
  runLevel: number;
  overlay: 'none' | 'upgrade' | 'branch' | 'shop' | 'replacement';
  optionIds: string[];
}

async function clickLogical(page: Page, x: number, y: number): Promise<void> {
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas has no bounding box');
  await page.mouse.click(
    box.x + (x / LOGICAL_WIDTH) * box.width,
    box.y + (y / LOGICAL_HEIGHT) * box.height,
  );
}

async function installMaxMetaSave(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.setItem('rogue-defense.save', JSON.stringify({
      version: 1,
      accountLevel: 100,
      accountXp: 0,
      gold: 0,
      techPoints: 0,
      tech: {
        damageTraining: 10,
        baseFortification: 10,
        startingCredits: 5,
        speedControl: 3,
        rerollPrep: 2,
      },
      maxDifficultyUnlocked: 1,
      selectedDifficulty: 1,
      highWaveByDifficulty: [0, 0, 0, 0, 0],
      lifetime: {
        runs: 0,
        kills: 0,
        bossKills: 0,
        totalGoldEarned: 0,
        highestRunLevel: 1,
      },
    }));
  });
}

function preferredUpgradeIndex(optionIds: string[]): number {
  const priorities = [
    'unlock:lmg', 'unlock:sniper', 'global-damage', 'global-attack-speed',
    'unlock:auto-gl', 'unlock:tesla', 'unlock:shotgun',
    'weapon-level:lmg', 'weapon-level:sniper', 'weapon-level:auto-cannon',
    'weapon-level:auto-gl', 'weapon-level:tesla', 'weapon-level:shotgun',
    'combo:OVERLOAD', 'combo:CONTROL_EXECUTION', 'combo:DETONATION',
    'combo:CONCUSSIVE_BREAK', 'base-max-hp',
  ];
  for (const id of priorities) {
    const index = optionIds.indexOf(id);
    if (index >= 0) return index;
  }
  return 0;
}

async function configureFunctionalSoak(page: Page): Promise<void> {
  await page.evaluate(() => {
    const game = (window as unknown as { __rogueDefenseGame?: { scene: { getScene: (key: string) => unknown } } }).__rogueDefenseGame;
    const combat = game?.scene.getScene('CombatScene') as {
      maxGameSpeed?: number;
      gameSpeed?: number;
      globalDamageMultiplier?: number;
      base?: { increaseMaxHp: (multiplier: number) => void };
      refreshWeaponModifiers?: () => void;
    } | undefined;
    if (!combat) throw new Error('DEV Phaser game probe unavailable');
    combat.maxGameSpeed = 4;
    combat.gameSpeed = 4;
    combat.globalDamageMultiplier = (combat.globalDamageMultiplier ?? 1) * 50;
    combat.base?.increaseMaxHp(50);
    combat.refreshWeaponModifiers?.();
  });
}

async function advanceCombat(page: Page, stepCount = 500): Promise<CombatSnapshot> {
  return page.evaluate((steps) => {
    type Overlay = { visible: boolean };
    type UpgradeOverlayProbe = Overlay & { optionIds: readonly string[] };
    type CombatProbe = {
      update: (time: number, delta: number) => void;
      waveManager: { wave: number };
      runState: { level: number };
      upgradeOverlay: UpgradeOverlayProbe;
      branchOverlay: Overlay;
      bossShopOverlay: Overlay;
      replacementOverlay: Overlay;
    };
    const game = (window as unknown as {
      __rogueDefenseGame?: {
        scene: {
          getScene: (key: string) => unknown;
          getScenes: (activeOnly: boolean) => Array<{ scene: { key: string } }>;
        };
      };
    }).__rogueDefenseGame;
    if (!game) throw new Error('DEV Phaser game probe unavailable');
    const combat = game.scene.getScene('CombatScene') as CombatProbe;

    const getOverlay = (): CombatSnapshot['overlay'] => combat.replacementOverlay.visible
      ? 'replacement'
      : combat.branchOverlay.visible
        ? 'branch'
        : combat.bossShopOverlay.visible
          ? 'shop'
          : combat.upgradeOverlay.visible
            ? 'upgrade'
            : 'none';

    for (let index = 0; index < steps; index += 1) {
      const active = game.scene.getScenes(true)[0];
      if (!active || active.scene.key !== 'CombatScene') break;
      if (getOverlay() !== 'none') break;
      combat.update(performance.now(), 50);
    }

    const active = game.scene.getScenes(true)[0];
    return {
      scene: active?.scene.key ?? 'none',
      wave: combat.waveManager?.wave ?? 0,
      runLevel: combat.runState?.level ?? 0,
      overlay: active?.scene.key === 'CombatScene' ? getOverlay() : 'none',
      optionIds: [...(combat.upgradeOverlay?.optionIds ?? [])],
    };
  }, stepCount);
}

async function resolveOverlay(page: Page, snapshot: CombatSnapshot): Promise<void> {
  if (snapshot.overlay === 'upgrade') {
    const index = preferredUpgradeIndex(snapshot.optionIds);
    await clickLogical(page, 500, 470 + index * 250);
    return;
  }
  if (snapshot.overlay === 'branch') {
    await clickLogical(page, 500, 500);
    return;
  }
  if (snapshot.overlay === 'replacement') {
    await clickLogical(page, 500, 1345);
    return;
  }
  if (snapshot.overlay === 'shop') {
    await clickLogical(page, 500, 315);
    await page.waitForTimeout(5);
    const afterPurchase = await advanceCombat(page, 1);
    if (afterPurchase.overlay === 'replacement') await clickLogical(page, 500, 1345);
    if (afterPurchase.overlay === 'branch') await clickLogical(page, 500, 500);
    await page.waitForTimeout(5);
    await clickLogical(page, 735, 1405);
  }
}

test('DEV functional W1 soak reaches W101 and verifies Difficulty II settlement chain', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1000, height: 1600 });
  await page.goto('/?dev=1');
  await installMaxMetaSave(page);
  await page.reload();

  const app = page.locator('#app');
  await expect(app).toHaveAttribute('data-scene', 'menu');
  await clickLogical(page, 500, 675);
  await expect(app).toHaveAttribute('data-scene', 'combat');
  await expect(app).toHaveAttribute('data-dev-run', '0');
  await configureFunctionalSoak(page);

  let snapshot = await advanceCombat(page, 1);
  for (let cycle = 0; cycle < 300 && snapshot.scene === 'CombatScene' && snapshot.wave < 101; cycle += 1) {
    if (snapshot.overlay !== 'none') {
      await resolveOverlay(page, snapshot);
      snapshot = await advanceCombat(page, 1);
      continue;
    }
    snapshot = await advanceCombat(page, 500);
  }

  expect(snapshot.scene, `Functional soak left combat at W${snapshot.wave}`).toBe('CombatScene');
  expect(snapshot.wave, 'Functional soak ended before W101').toBeGreaterThanOrEqual(101);
  expect(snapshot.runLevel).toBeGreaterThanOrEqual(50);
  expect(snapshot.runLevel).toBeLessThanOrEqual(80);

  await clickLogical(page, 870, 330);
  await expect(app).toHaveAttribute('data-scene', 'settlement');

  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('rogue-defense.save') ?? '{}')) as {
    maxDifficultyUnlocked?: number;
    highWaveByDifficulty?: number[];
    lifetime?: { runs?: number; highestRunLevel?: number };
  };
  expect(save.maxDifficultyUnlocked).toBe(2);
  expect(save.highWaveByDifficulty?.[0] ?? 0).toBeGreaterThanOrEqual(101);
  expect(save.lifetime?.runs).toBe(1);
  expect(save.lifetime?.highestRunLevel ?? 0).toBeGreaterThanOrEqual(50);
});

async function selectDevWave(page: Page, wave: 1 | 50 | 100): Promise<void> {
  if (wave === 50) await clickLogical(page, 700, 322);
  if (wave === 100) await clickLogical(page, 910, 322);
}

async function measureStressFps(page: Page, wave: 1 | 50 | 100): Promise<number> {
  await page.setViewportSize({ width: 1000, height: 1600 });
  await page.goto('/?dev=1');
  const app = page.locator('#app');
  await expect(app).toHaveAttribute('data-scene', 'menu');
  await selectDevWave(page, wave);
  await clickLogical(page, 910, 378);
  await clickLogical(page, 500, 675);
  await expect(app).toHaveAttribute('data-scene', 'combat');
  await expect.poll(async () => Number(await app.getAttribute('data-enemy-count'))).toBeGreaterThanOrEqual(300);

  await page.waitForTimeout(1000);
  const samples: number[] = [];
  for (let index = 0; index < 10; index += 1) {
    const fps = Number(await app.getAttribute('data-fps') ?? '0');
    if (fps > 0) samples.push(fps);
    await page.waitForTimeout(200);
  }
  if (samples.length === 0) return 0;
  return samples.reduce((sum, value) => sum + value, 0) / samples.length;
}

test('Stress300 automated Chromium baseline remains responsive at W1/W50/W100', async ({ browser }) => {
  test.setTimeout(90_000);
  const metrics: Record<string, number> = {};

  for (const wave of [1, 50, 100] as const) {
    const page = await browser.newPage();
    metrics[`W${wave}`] = await measureStressFps(page, wave);
    await page.close();
  }

  mkdirSync('test-results', { recursive: true });
  writeFileSync('test-results/rc-perf.json', `${JSON.stringify(metrics, null, 2)}\n`, 'utf8');
  console.log(`RC_PERF ${JSON.stringify(metrics)}`);

  expect(metrics.W1).toBeGreaterThanOrEqual(15);
  expect(metrics.W50).toBeGreaterThanOrEqual(15);
  expect(metrics.W100).toBeGreaterThanOrEqual(15);
});
