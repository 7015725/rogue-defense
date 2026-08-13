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
    type GameObjectProbe = { text?: string; visible?: boolean; list?: GameObjectProbe[] };
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

async function bossSnapshot(page: Page): Promise<{ maxHp: number; enemyCount: number; escorts: number; flying: number }> {
  return page.evaluate(() => {
    type EnemyProbe = { kind: string; domain: string; maxHp: number };
    type CombatProbe = { enemies: EnemyProbe[] };
    const game = (window as Window & {
      __rogueDefenseGame?: { scene: { getScene: (key: string) => unknown } };
    }).__rogueDefenseGame;
    const combat = game?.scene.getScene('CombatScene') as CombatProbe | undefined;
    if (!combat) throw new Error('CombatScene unavailable');
    const boss = combat.enemies.find((enemy) => enemy.kind === 'boss');
    return {
      maxHp: boss?.maxHp ?? 0,
      enemyCount: combat.enemies.length,
      escorts: combat.enemies.filter((enemy) => enemy.kind !== 'boss').length,
      flying: combat.enemies.filter((enemy) => enemy.domain === 'AIR').length,
    };
  });
}

test('first two boss checkpoints use staged HP and escort pressure', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 1600 });
  await page.goto('/?dev=1');
  const app = page.locator('#app');
  await expect(app).toHaveAttribute('data-scene', 'menu');

  await clickLogical(page, 910, 270); // DEV W20 preset
  await clickLogical(page, 500, 675);
  await expect(app).toHaveAttribute('data-scene', 'combat');
  await expect(app).toHaveAttribute('data-wave', '20');
  await expect.poll(async () => (await bossSnapshot(page)).maxHp).toBe(2974);

  const wave20 = await bossSnapshot(page);
  expect(wave20.enemyCount).toBe(1);
  expect(wave20.escorts).toBe(0);
  expect(wave20.flying).toBe(0);

  await page.evaluate(() => {
    type EnemyProbe = { destroy: () => void };
    type CombatProbe = {
      enemies: EnemyProbe[];
      waveManager: { debugJumpToWave: (wave: number) => void };
    };
    const game = (window as Window & {
      __rogueDefenseGame?: { scene: { getScene: (key: string) => unknown } };
    }).__rogueDefenseGame;
    const combat = game?.scene.getScene('CombatScene') as CombatProbe | undefined;
    if (!combat) throw new Error('CombatScene unavailable');
    for (const enemy of combat.enemies) enemy.destroy();
    combat.enemies = [];
    combat.waveManager.debugJumpToWave(30);
  });

  await expect(app).toHaveAttribute('data-wave', '30');
  await expect.poll(async () => (await bossSnapshot(page)).maxHp).toBe(4473);
  const wave30 = await bossSnapshot(page);
  expect(wave30.enemyCount).toBe(3);
  expect(wave30.escorts).toBe(2);
  expect(wave30.flying).toBe(0);
});

test('boss combat telemetry is surfaced on settlement', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 1600 });
  await page.goto('/?dev=1');
  const app = page.locator('#app');
  await clickLogical(page, 910, 270);
  await clickLogical(page, 500, 675);
  await expect(app).toHaveAttribute('data-scene', 'combat');
  await expect.poll(async () => (await bossSnapshot(page)).maxHp).toBe(2974);

  await page.waitForTimeout(300);
  await page.evaluate(() => {
    type EnemyProbe = { kind: string; takeDamage: (amount: number) => void };
    type WeaponProbe = { destroy: () => void };
    type CombatProbe = {
      enemies: EnemyProbe[];
      weapons: WeaponProbe[];
      projectilePool: { clear: () => void };
    };
    const game = (window as Window & {
      __rogueDefenseGame?: { scene: { getScene: (key: string) => unknown } };
    }).__rogueDefenseGame;
    const combat = game?.scene.getScene('CombatScene') as CombatProbe | undefined;
    if (!combat) throw new Error('CombatScene unavailable');
    for (const weapon of combat.weapons) weapon.destroy();
    combat.weapons = [];
    combat.projectilePool.clear();
    combat.enemies.find((enemy) => enemy.kind === 'boss')?.takeDamage(100);
  });
  await page.waitForTimeout(100);

  await clickLogical(page, 922, 111);
  await expect(app).toHaveAttribute('data-scene', 'settlement');
  const text = await visibleSceneText(page);
  expect(text).toContain('首领分析');
  expect(text).toContain('承受伤害');
  expect(text).toContain('实战 DPS');
});
