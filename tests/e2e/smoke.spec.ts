import { expect, test, type Page } from '@playwright/test';

const LOGICAL_WIDTH = 1000;
const LOGICAL_HEIGHT = 1600;

async function clickLogical(page: Page, x: number, y: number): Promise<void> {
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  const transformed = await page.evaluate(({ logicalX, logicalY }) => {
    type ScaleProbe = {
      updateBounds: () => void;
      canvasBounds: { x: number; y: number };
      displayScale: { x: number; y: number };
    };
    const game = (window as Window & { __rogueDefenseGame?: { scale: ScaleProbe } }).__rogueDefenseGame;
    if (!game) return null;
    game.scale.updateBounds();
    return {
      x: game.scale.canvasBounds.x + logicalX / game.scale.displayScale.x,
      y: game.scale.canvasBounds.y + logicalY / game.scale.displayScale.y,
    };
  }, { logicalX: x, logicalY: y });

  if (transformed) {
    await page.mouse.click(transformed.x, transformed.y);
    return;
  }

  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas has no bounding box');
  await page.mouse.click(
    box.x + (x / LOGICAL_WIDTH) * box.width,
    box.y + (y / LOGICAL_HEIGHT) * box.height,
  );
}

function collectBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

test('normal W1 run starts and settlement persists permanent progress', async ({ page }) => {
  const errors = collectBrowserErrors(page);
  await page.setViewportSize({ width: 1000, height: 1600 });
  await page.goto('/?dev=1');

  const app = page.locator('#app');
  await expect(app).toHaveAttribute('data-scene', 'menu');
  await expect(page.locator('canvas')).toBeVisible();

  await clickLogical(page, 500, 675);
  await expect(app).toHaveAttribute('data-scene', 'combat');
  await expect(app).toHaveAttribute('data-wave', '1');
  await expect(app).toHaveAttribute('data-dev-run', '0');

  const saveBefore = await page.evaluate(() => localStorage.getItem('rogue-defense.save'));
  expect(saveBefore).not.toBeNull();

  await clickLogical(page, 870, 330);
  await expect(app).toHaveAttribute('data-scene', 'settlement');

  const saveAfter = await page.evaluate(() => localStorage.getItem('rogue-defense.save'));
  expect(saveAfter).not.toBeNull();
  expect(saveAfter).not.toBe(saveBefore);

  const parsed = JSON.parse(saveAfter ?? '{}') as { gold?: number; lifetime?: { runs?: number } };
  expect(parsed.gold ?? 0).toBeGreaterThan(0);
  expect(parsed.lifetime?.runs ?? 0).toBe(1);
  expect(errors).toEqual([]);
});

test('DEV W100 + Stress 300 reaches combat and does not persist settlement', async ({ page }) => {
  const errors = collectBrowserErrors(page);
  await page.setViewportSize({ width: 1000, height: 1600 });
  await page.goto('/?dev=1');

  const app = page.locator('#app');
  await expect(app).toHaveAttribute('data-scene', 'menu');

  await clickLogical(page, 910, 322);
  await expect(app).toHaveAttribute('data-start-wave', '100');

  await clickLogical(page, 910, 378);
  await expect(app).toHaveAttribute('data-stress-count', '300');

  await clickLogical(page, 500, 675);
  await expect(app).toHaveAttribute('data-scene', 'combat');
  await expect(app).toHaveAttribute('data-wave', '100');
  await expect(app).toHaveAttribute('data-dev-run', '1');
  await expect(app).toHaveAttribute('data-stress-count', '300');
  await expect.poll(async () => Number(await app.getAttribute('data-enemy-count'))).toBeGreaterThanOrEqual(300);

  const saveBeforeSettlement = await page.evaluate(() => localStorage.getItem('rogue-defense.save'));
  expect(saveBeforeSettlement).not.toBeNull();

  await clickLogical(page, 870, 330);
  await expect(app).toHaveAttribute('data-scene', 'settlement');

  const saveAfterSettlement = await page.evaluate(() => localStorage.getItem('rogue-defense.save'));
  expect(saveAfterSettlement).toBe(saveBeforeSettlement);
  expect(errors).toEqual([]);
});

test('mobile portrait viewport fills canvas and starts with touch input', async ({ page }) => {
  const errors = collectBrowserErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?dev=1');

  const app = page.locator('#app');
  const canvas = page.locator('canvas');
  await expect(app).toHaveAttribute('data-scene', 'menu');
  await expect(canvas).toBeVisible();

  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.x ?? 9999).toBeLessThanOrEqual(2);
  expect(box?.y ?? 9999).toBeLessThanOrEqual(2);
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(388);
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(842);
  expect(box?.width ?? 9999).toBeLessThanOrEqual(390);
  expect(box?.height ?? 9999).toBeLessThanOrEqual(844);

  await clickLogical(page, 500, 675);
  await expect(app).toHaveAttribute('data-scene', 'combat');
  await expect(app).toHaveAttribute('data-wave', '1');
  expect(errors).toEqual([]);
});

test('PWA shell files are present in production preview', async ({ request }) => {
  const manifest = await request.get('/manifest.webmanifest');
  const serviceWorker = await request.get('/sw.js');
  const icon = await request.get('/icon.svg');

  expect(manifest.ok()).toBeTruthy();
  expect(serviceWorker.ok()).toBeTruthy();
  expect(icon.ok()).toBeTruthy();
  expect(await manifest.text()).toContain('Rogue Defense');
  expect(await serviceWorker.text()).toContain('rogue-defense-v0.1-rc1');
});
