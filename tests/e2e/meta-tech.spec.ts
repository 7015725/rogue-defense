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

test('meta tech tree is a separate scene and can purchase a selected hex node', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 1600 });
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    localStorage.setItem('rogue-defense.save', JSON.stringify({
      version: 1,
      accountLevel: 5,
      accountXp: 0,
      gold: 500,
      techPoints: 10,
      tech: { damageTraining: 0, baseFortification: 0, startingCredits: 0, speedControl: 0, rerollPrep: 0 },
      maxDifficultyUnlocked: 1,
      selectedDifficulty: 1,
      highWaveByDifficulty: [0, 0, 0, 0, 0],
      lifetime: { runs: 0, kills: 0, bossKills: 0, totalGoldEarned: 0, highestRunLevel: 1 },
    }));
  });
  await page.reload();

  const app = page.locator('#app');
  await expect(app).toHaveAttribute('data-scene', 'menu');
  await clickLogical(page, 500, 835);
  await expect(app).toHaveAttribute('data-scene', 'tech-tree');

  // Firepower Training is the default selected node; purchase its first level.
  await clickLogical(page, 755, 1290);
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('rogue-defense.save') ?? '{}')) as {
    gold?: number;
    tech?: { damageTraining?: number };
  };
  expect(save.gold).toBe(420);
  expect(save.tech?.damageTraining).toBe(1);

  await clickLogical(page, 745, 1510);
  await expect(app).toHaveAttribute('data-scene', 'menu');
});
