import { expect, test, type Page } from '@playwright/test';

const LOGICAL_WIDTH = 1000;
const LOGICAL_HEIGHT = 1600;

async function getScreenPoint(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
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

  if (transformed) return transformed;

  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas has no bounding box');
  return {
    x: box.x + (x / LOGICAL_WIDTH) * box.width,
    y: box.y + (y / LOGICAL_HEIGHT) * box.height,
  };
}

async function clickLogical(page: Page, x: number, y: number): Promise<void> {
  const point = await getScreenPoint(page, x, y);
  await page.mouse.click(point.x, point.y);
}

async function tapLogical(page: Page, x: number, y: number): Promise<void> {
  const point = await getScreenPoint(page, x, y);
  await page.touchscreen.tap(point.x, point.y);
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

  await clickLogical(page, 865, 250);
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

  await clickLogical(page, 865, 250);
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

test('mobile touch can operate upgrade, branch, shop, and replacement overlays', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors = collectBrowserErrors(page);
  await page.goto('/?dev=1');

  const app = page.locator('#app');
  await expect(app).toHaveAttribute('data-scene', 'menu');
  await tapLogical(page, 500, 675);
  await expect(app).toHaveAttribute('data-scene', 'combat');

  await page.evaluate(() => {
    type UpgradeOverlayProbe = { show: (options: unknown[], skipReward: number, rerolls: number) => void };
    type CombatProbe = { upgradeOverlay: UpgradeOverlayProbe };
    const game = (window as Window & { __rogueDefenseGame?: { scene: { getScene: (key: string) => unknown } } }).__rogueDefenseGame;
    const combat = game?.scene.getScene('CombatScene') as CombatProbe | undefined;
    combat?.upgradeOverlay.show([
      { id: 'mobile-a', kind: 'global-damage', title: '强化弹药', description: '所有武器伤害 +10%', rarity: 'COMMON', weight: 1 },
      { id: 'mobile-b', kind: 'global-attack-speed', title: '快速循环', description: '所有武器攻击速度 +8%', rarity: 'COMMON', weight: 1 },
      { id: 'mobile-c', kind: 'base-max-hp', title: '加固基地', description: '基地最大生命 +12%', rarity: 'RARE', weight: 1 },
    ], 25, 1);
  });
  await expect(app).toHaveAttribute('data-overlay', 'upgrade');
  await tapLogical(page, 500, 390);
  await expect(app).toHaveAttribute('data-overlay', 'none');

  await page.evaluate(() => {
    type BranchProbe = { show: (weapon: unknown, stage: 5, choices: unknown[]) => void };
    type WeaponProbe = { getBranchChoices: (stage: 5) => unknown[] };
    type CombatProbe = { branchOverlay: BranchProbe; weapons: WeaponProbe[] };
    const game = (window as Window & { __rogueDefenseGame?: { scene: { getScene: (key: string) => unknown } } }).__rogueDefenseGame;
    const combat = game?.scene.getScene('CombatScene') as CombatProbe | undefined;
    const weapon = combat?.weapons[0];
    if (combat && weapon) combat.branchOverlay.show(weapon, 5, weapon.getBranchChoices(5));
  });
  await expect(app).toHaveAttribute('data-overlay', 'branch');
  await tapLogical(page, 500, 405);
  await expect(app).toHaveAttribute('data-overlay', 'none');

  await page.evaluate(() => {
    type ShopProbe = { show: (wave: number, items: unknown[], purchased: Set<string>, credits: number, refreshCost: number) => void };
    type CombatProbe = { bossShopOverlay: ShopProbe };
    const game = (window as Window & { __rogueDefenseGame?: { scene: { getScene: (key: string) => unknown } } }).__rogueDefenseGame;
    const combat = game?.scene.getScene('CombatScene') as CombatProbe | undefined;
    const items = Array.from({ length: 5 }, (_, index) => ({
      id: `mobile-shop-${index}`,
      kind: 'global-damage',
      title: `测试商品 ${index + 1}`,
      description: '手机竖屏商品说明可读性测试',
      cost: 40 + index * 10,
      rarity: index === 4 ? 'EPIC' : index === 3 ? 'RARE' : 'COMMON',
    }));
    combat?.bossShopOverlay.show(10, items, new Set<string>(), 999, 60);
  });
  await expect(app).toHaveAttribute('data-overlay', 'shop');
  await tapLogical(page, 735, 1370);
  await expect(app).toHaveAttribute('data-overlay', 'none');

  await page.evaluate(() => {
    type ReplacementProbe = { show: (name: string, level: number, candidates: unknown[]) => void };
    type CombatProbe = { replacementOverlay: ReplacementProbe };
    const game = (window as Window & { __rogueDefenseGame?: { scene: { getScene: (key: string) => unknown } } }).__rogueDefenseGame;
    const combat = game?.scene.getScene('CombatScene') as CombatProbe | undefined;
    combat?.replacementOverlay.show('LMG Nest', 4, [
      { id: 'a', name: 'Auto-GL', level: 5 },
      { id: 'b', name: 'Tesla Coil', level: 6 },
      { id: 'c', name: 'Bolt-Action Sniper', level: 7 },
      { id: 'd', name: 'Tac-Shotgun Bunker', level: 8 },
    ]);
  });
  await expect(app).toHaveAttribute('data-overlay', 'replacement');
  await tapLogical(page, 500, 1325);
  await expect(app).toHaveAttribute('data-overlay', 'none');

  expect(errors).toEqual([]);
  await context.close();
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
