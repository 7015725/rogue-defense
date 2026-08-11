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
      tech: { damageTraining: 10, baseFortification: 10, startingCredits: 5, speedControl: 3, rerollPrep: 2 },
      maxDifficultyUnlocked: 1,
      selectedDifficulty: 1,
      highWaveByDifficulty: [0, 0, 0, 0, 0],
      lifetime: { runs: 0, kills: 0, bossKills: 0, totalGoldEarned: 0, highestRunLevel: 1 },
    }));
  });
}

const UPGRADE_PRIORITIES = [
  'unlock:lmg', 'unlock:sniper', 'global-damage', 'global-attack-speed',
  'weapon-level:auto-cannon', 'base-max-hp',
] as const;

test('RC checkpoint soak validates W10-W100 Boss Shop chain and W101 difficulty unlock', async ({ page }) => {
  test.setTimeout(45_000);
  await page.setViewportSize({ width: 1000, height: 1600 });
  await page.goto('/?dev=1');
  await installMaxMetaSave(page);
  await page.reload();

  const app = page.locator('#app');
  await expect(app).toHaveAttribute('data-scene', 'menu');
  await clickLogical(page, 500, 675);
  await expect(app).toHaveAttribute('data-scene', 'combat');

  const result = await page.evaluate((priorities) => {
    type UpgradeOverlayProbe = { visible: boolean; optionIds: readonly string[]; selectIndex: (index: number) => boolean };
    type BranchOverlayProbe = { visible: boolean; selectIndex: (index: number) => boolean };
    type OverlayProbe = { visible: boolean };
    type WaveManagerProbe = { wave: number; constructor: new (startWave?: number) => WaveManagerProbe };
    type CombatProbe = {
      update: (time: number, delta: number) => void;
      finishRun: (reason: 'VOLUNTARY_EXIT') => void;
      handleLeaveShop: () => void;
      handleReplacementSelection: (weaponId: string | null) => void;
      waveManager: WaveManagerProbe;
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
      __rogueDefenseGame?: { scene: { getScene: (key: string) => unknown; getScenes: (activeOnly: boolean) => Array<{ scene: { key: string } }> } };
    }).__rogueDefenseGame;
    if (!game) throw new Error('DEV Phaser game probe unavailable');
    const combat = game.scene.getScene('CombatScene') as CombatProbe;

    combat.maxGameSpeed = 4;
    combat.gameSpeed = 4;
    combat.globalDamageMultiplier *= 10_000;
    combat.base.increaseMaxHp(100);
    combat.refreshWeaponModifiers();

    const resolveChoices = (): void => {
      if (combat.upgradeOverlay.visible) {
        const ids = [...combat.upgradeOverlay.optionIds];
        let chosen = 0;
        for (const id of priorities) {
          const index = ids.indexOf(id);
          if (index >= 0) { chosen = index; break; }
        }
        if (!combat.upgradeOverlay.selectIndex(chosen)) throw new Error('Unable to resolve upgrade overlay');
      } else if (combat.branchOverlay.visible) {
        if (!combat.branchOverlay.selectIndex(0)) throw new Error('Unable to resolve branch overlay');
      } else if (combat.replacementOverlay.visible) {
        combat.handleReplacementSelection(null);
      }
    };

    const checkpoints: number[] = [];
    for (const wave of [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) {
      const Manager = combat.waveManager.constructor;
      combat.waveManager = new Manager(wave);
      let guard = 0;
      while (!combat.bossShopOverlay.visible && guard < 500) {
        resolveChoices();
        if (!combat.upgradeOverlay.visible && !combat.branchOverlay.visible && !combat.replacementOverlay.visible) {
          combat.update(performance.now(), 50);
        }
        guard += 1;
      }
      if (!combat.bossShopOverlay.visible) throw new Error(`Boss Shop did not open at W${wave}`);
      checkpoints.push(wave);
      combat.handleLeaveShop();
      if (combat.waveManager.wave !== wave + 1) throw new Error(`Boss Shop W${wave} did not resume to W${wave + 1}`);
      resolveChoices();
    }

    const waveAfter100 = combat.waveManager.wave;
    combat.finishRun('VOLUNTARY_EXIT');
    return { checkpoints, waveAfter100 };
  }, UPGRADE_PRIORITIES);

  expect(result.checkpoints).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  expect(result.waveAfter100).toBe(101);
  await expect(app).toHaveAttribute('data-scene', 'settlement');

  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('rogue-defense.save') ?? '{}')) as {
    maxDifficultyUnlocked?: number;
    highWaveByDifficulty?: number[];
    lifetime?: { runs?: number };
  };
  expect(save.maxDifficultyUnlocked).toBe(2);
  expect(save.highWaveByDifficulty?.[0] ?? 0).toBeGreaterThanOrEqual(101);
  expect(save.lifetime?.runs).toBe(1);
  console.log('RC_FUNCTIONAL PASS');
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

  await page.evaluate(() => {
    type CombatProbe = { waveManager: { update: (deltaMs: number, bossAlive: boolean) => unknown[] } };
    const game = (window as unknown as {
      __rogueDefenseGame?: { scene: { getScene: (key: string) => unknown } };
    }).__rogueDefenseGame;
    const combat = game?.scene.getScene('CombatScene') as CombatProbe | undefined;
    if (!combat) throw new Error('DEV Phaser game probe unavailable for perf hold');
    combat.waveManager.update = () => [];
  });

  await expect.poll(async () => Number(await app.getAttribute('data-enemy-count'))).toBeGreaterThanOrEqual(300);
  await page.waitForTimeout(500);

  return page.evaluate(() => new Promise<number>((resolve) => {
    const frameTimes: number[] = [];
    let previous = performance.now();
    let finished = false;

    const finish = (value: number): void => {
      if (finished) return;
      finished = true;
      resolve(value);
    };

    const safety = window.setTimeout(() => finish(0), 7000);
    const sample = (now: number): void => {
      if (finished) return;
      const delta = now - previous;
      previous = now;
      if (delta > 0 && delta < 1000) frameTimes.push(delta);
      if (frameTimes.length >= 45) {
        window.clearTimeout(safety);
        const stable = frameTimes.slice(5).sort((a, b) => a - b);
        const medianMs = stable[Math.floor(stable.length / 2)] ?? 1000;
        finish(1000 / medianMs);
        return;
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }));
}

test('Stress300 automated Chromium baseline remains responsive at W1/W50/W100', async ({ browser }) => {
  test.setTimeout(60_000);
  const metrics: Record<string, number> = {};
  for (const wave of [1, 50, 100] as const) {
    const page = await browser.newPage();
    metrics[`W${wave}`] = await measureStressFps(page, wave);
    await page.close();
  }

  mkdirSync('test-results', { recursive: true });
  writeFileSync('test-results/rc-perf.json', `${JSON.stringify(metrics, null, 2)}\n`, 'utf8');
  console.log(`RC_PERF ${JSON.stringify(metrics)}`);
});
