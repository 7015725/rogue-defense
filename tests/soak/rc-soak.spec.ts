import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const LOGICAL_WIDTH = 1000;
const LOGICAL_HEIGHT = 1600;

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

const UPGRADE_PRIORITIES = [
  'unlock:lmg', 'unlock:sniper', 'global-damage', 'global-attack-speed',
  'unlock:auto-gl', 'unlock:tesla', 'unlock:shotgun',
  'weapon-level:lmg', 'weapon-level:sniper', 'weapon-level:auto-cannon',
  'weapon-level:auto-gl', 'weapon-level:tesla', 'weapon-level:shotgun',
  'combo:OVERLOAD', 'combo:CONTROL_EXECUTION', 'combo:DETONATION',
  'combo:CONCUSSIVE_BREAK', 'base-max-hp',
] as const;

test('DEV functional W1 soak reaches W101 and verifies Difficulty II settlement chain', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1000, height: 1600 });
  await page.goto('/?dev=1');
  await installMaxMetaSave(page);
  await page.reload();

  const app = page.locator('#app');
  await expect(app).toHaveAttribute('data-scene', 'menu');
  await clickLogical(page, 500, 675);
  await expect(app).toHaveAttribute('data-scene', 'combat');
  await expect(app).toHaveAttribute('data-dev-run', '0');

  const result = await page.evaluate((priorities) => {
    type UpgradeOverlayProbe = {
      visible: boolean;
      optionIds: readonly string[];
      selectIndex: (index: number) => boolean;
    };
    type BranchOverlayProbe = { visible: boolean; selectIndex: (index: number) => boolean };
    type OverlayProbe = { visible: boolean };
    type CombatProbe = {
      update: (time: number, delta: number) => void;
      finishRun: (reason: 'VOLUNTARY_EXIT') => void;
      handleLeaveShop: () => void;
      handleReplacementSelection: (weaponId: string | null) => void;
      waveManager: { wave: number };
      runState: { level: number };
      upgradeOverlay: UpgradeOverlayProbe;
      branchOverlay: BranchOverlayProbe;
      bossShopOverlay: OverlayProbe;
      replacementOverlay: OverlayProbe;
      maxGameSpeed: number;
      gameSpeed: number;
      globalDamageMultiplier: number;
      base: { increaseMaxHp: (multiplier: number) => void };
      refreshWeaponModifiers: () => void;
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

    combat.maxGameSpeed = 16;
    combat.gameSpeed = 16;
    combat.globalDamageMultiplier *= 200;
    combat.base.increaseMaxHp(100);
    combat.refreshWeaponModifiers();

    let updates = 0;
    let upgrades = 0;
    let branches = 0;
    let shops = 0;

    while (updates < 20_000) {
      const active = game.scene.getScenes(true)[0];
      if (!active || active.scene.key !== 'CombatScene') break;
      if (combat.waveManager.wave >= 101) break;

      if (combat.upgradeOverlay.visible) {
        const ids = [...combat.upgradeOverlay.optionIds];
        let chosen = 0;
        for (const id of priorities) {
          const index = ids.indexOf(id);
          if (index >= 0) {
            chosen = index;
            break;
          }
        }
        if (!combat.upgradeOverlay.selectIndex(chosen)) throw new Error('Unable to resolve upgrade overlay');
        upgrades += 1;
        continue;
      }
      if (combat.branchOverlay.visible) {
        if (!combat.branchOverlay.selectIndex(0)) throw new Error('Unable to resolve branch overlay');
        branches += 1;
        continue;
      }
      if (combat.replacementOverlay.visible) {
        combat.handleReplacementSelection(null);
        continue;
      }
      if (combat.bossShopOverlay.visible) {
        combat.handleLeaveShop();
        shops += 1;
        continue;
      }

      combat.update(performance.now(), 50);
      updates += 1;
    }

    const wave = combat.waveManager.wave;
    const runLevel = combat.runState.level;
    const activeKey = game.scene.getScenes(true)[0]?.scene.key ?? 'none';
    if (activeKey === 'CombatScene' && wave >= 101) combat.finishRun('VOLUNTARY_EXIT');
    return { wave, runLevel, activeKey, updates, upgrades, branches, shops };
  }, UPGRADE_PRIORITIES);

  expect(result.activeKey, `Functional soak left combat at W${result.wave}`).toBe('CombatScene');
  expect(result.wave, `Functional soak stopped after ${result.updates} updates`).toBeGreaterThanOrEqual(101);
  expect(result.shops).toBeGreaterThanOrEqual(10);
  expect(result.upgrades).toBeGreaterThan(20);
  expect(result.runLevel).toBeGreaterThanOrEqual(45);
  expect(result.runLevel).toBeLessThanOrEqual(80);

  await expect(app).toHaveAttribute('data-scene', 'settlement');
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('rogue-defense.save') ?? '{}')) as {
    maxDifficultyUnlocked?: number;
    highWaveByDifficulty?: number[];
    lifetime?: { runs?: number; highestRunLevel?: number };
  };
  expect(save.maxDifficultyUnlocked).toBe(2);
  expect(save.highWaveByDifficulty?.[0] ?? 0).toBeGreaterThanOrEqual(101);
  expect(save.lifetime?.runs).toBe(1);
  expect(save.lifetime?.highestRunLevel ?? 0).toBeGreaterThanOrEqual(45);
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
