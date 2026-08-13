import { expect, test } from '@playwright/test';

test('early wave advance unlocks after spawn window and awards credits', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 1600 });
  await page.goto('/?dev=1');

  const app = page.locator('#app');
  await expect(app).toHaveAttribute('data-scene', 'menu');
  await page.mouse.click(500, 675);
  await expect(app).toHaveAttribute('data-scene', 'combat');

  const result = await page.evaluate(() => {
    interface WaveManagerProbe {
      wave: number;
      canAdvanceEarly: boolean;
      update: (deltaMs: number, bossAlive: boolean) => unknown[];
      getEarlyAdvanceBonus: (activeEnemyCount: number) => number;
      advanceEarly: (activeEnemyCount: number) => number;
    }
    interface RunStateProbe {
      credits: number;
      addCredits: (amount: number) => void;
    }
    interface CombatProbe {
      waveManager: WaveManagerProbe;
      runState: RunStateProbe;
    }

    const game = (window as Window & {
      __rogueDefenseGame?: { scene: { getScene: (key: string) => unknown } };
    }).__rogueDefenseGame;
    const combat = game?.scene.getScene('CombatScene') as CombatProbe | undefined;
    if (!combat) throw new Error('CombatScene probe unavailable');

    const beforeWave = combat.waveManager.wave;
    const beforeCredits = combat.runState.credits;
    const requests = combat.waveManager.update(25_000, false);
    const available = combat.waveManager.canAdvanceEarly;
    const previewBonus = combat.waveManager.getEarlyAdvanceBonus(5);
    const awardedBonus = combat.waveManager.advanceEarly(5);
    combat.runState.addCredits(awardedBonus);

    return {
      beforeWave,
      afterWave: combat.waveManager.wave,
      beforeCredits,
      afterCredits: combat.runState.credits,
      requests: requests.length,
      available,
      previewBonus,
      awardedBonus,
    };
  });

  expect(result.requests).toBeGreaterThan(0);
  expect(result.available).toBeTruthy();
  expect(result.previewBonus).toBeGreaterThan(0);
  expect(result.awardedBonus).toBe(result.previewBonus);
  expect(result.afterWave).toBe(result.beforeWave + 1);
  expect(result.afterCredits).toBe(result.beforeCredits + result.awardedBonus);
});
