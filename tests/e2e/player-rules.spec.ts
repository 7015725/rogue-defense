import { expect, test, type Page } from '@playwright/test';

const LOGICAL_WIDTH = 1000;
const LOGICAL_HEIGHT = 1600;

async function clickLogical(page: Page, x: number, y: number): Promise<void> {
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

  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('Canvas has no bounding box');
  await page.mouse.click(
    box.x + (x / LOGICAL_WIDTH) * box.width,
    box.y + (y / LOGICAL_HEIGHT) * box.height,
  );
}

async function visibleSceneText(page: Page): Promise<string> {
  return page.evaluate(() => {
    type GameObjectProbe = {
      text?: string;
      visible?: boolean;
      list?: GameObjectProbe[];
    };
    type SceneProbe = { children?: { list: GameObjectProbe[] } };
    const game = (window as Window & {
      __rogueDefenseGame?: { scene: { getScenes: (activeOnly: boolean) => SceneProbe[] } };
    }).__rogueDefenseGame;
    const scene = game?.scene.getScenes(true)[0];
    if (!scene?.children) return '';

    const values: string[] = [];
    const visit = (object: GameObjectProbe): void => {
      if (object.visible === false) return;
      if (typeof object.text === 'string') values.push(object.text);
      for (const child of object.list ?? []) visit(child);
    };
    for (const child of scene.children.list) visit(child);
    return values.join('\n');
  });
}

test('base auto cannon attacks enemies immediately at spawn range', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 1600 });
  await page.goto('/?dev=1');

  const app = page.locator('#app');
  await expect(app).toHaveAttribute('data-scene', 'menu');
  await clickLogical(page, 500, 675);
  await expect(app).toHaveAttribute('data-scene', 'combat');
  await expect(app).toHaveAttribute('data-wave', '1');
  await expect.poll(
    async () => Number(await app.getAttribute('data-enemy-count')),
    { timeout: 3_000 },
  ).toBeGreaterThan(0);
  await expect.poll(
    async () => Number(await app.getAttribute('data-projectile-count')),
    { timeout: 5_000 },
  ).toBeGreaterThan(0);
});

test('player-facing menu and upgrade terminology defaults to Chinese', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 1600 });
  await page.goto('/?dev=1');

  const app = page.locator('#app');
  await expect(app).toHaveAttribute('data-scene', 'menu');
  await expect.poll(async () => visibleSceneText(page)).toContain('账号等级');
  await expect.poll(async () => visibleSceneText(page)).toContain('开发测试');

  await clickLogical(page, 500, 675);
  await expect(app).toHaveAttribute('data-scene', 'combat');

  await page.evaluate(() => {
    type UpgradeOverlayProbe = { show: (options: unknown[], skipReward: number, rerolls: number) => void };
    type CombatProbe = { upgradeOverlay: UpgradeOverlayProbe };
    const game = (window as Window & {
      __rogueDefenseGame?: { scene: { getScene: (key: string) => unknown } };
    }).__rogueDefenseGame;
    const combat = game?.scene.getScene('CombatScene') as CombatProbe | undefined;
    combat?.upgradeOverlay.show([
      {
        id: 'zh-check-a',
        kind: 'unlock-weapon',
        title: 'Auto-GL',
        description: 'AOE · Burn · Reload · Armor Penetration',
        rarity: 'RARE',
        weight: 1,
        weaponId: 'auto-gl',
      },
      { id: 'zh-check-b', kind: 'global-damage', title: '强化弹药', description: '所有武器伤害 +10%', rarity: 'COMMON', weight: 1 },
      { id: 'zh-check-c', kind: 'base-max-hp', title: '加固基地', description: 'Base HP +12%', rarity: 'COMMON', weight: 1 },
    ], 30, 0);
  });

  await expect(app).toHaveAttribute('data-overlay', 'upgrade');
  await expect.poll(async () => visibleSceneText(page)).toContain('自动榴弹发射器');
  const text = await visibleSceneText(page);
  expect(text).toContain('范围伤害');
  expect(text).toContain('燃烧');
  expect(text).toContain('换弹');
  expect(text).toContain('护甲穿透');
  expect(text).not.toMatch(/Auto-GL|AOE|Burn|Reload|Armor Penetration/);
});
