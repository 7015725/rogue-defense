import { expect, test } from '@playwright/test';
import type { RandomWeaponId } from '../../src/combat/constants';
import {
  UpgradeDirectorLite,
  type OwnedWeaponSnapshot,
  type UpgradeContext,
} from '../../src/upgrades/UpgradeDirectorLite';

function weapon(id: string, name = id): OwnedWeaponSnapshot {
  return { id, name, level: 1, currentHp: 500, maxHp: 500 };
}

function context(
  runLevel: number,
  ownedRandomWeaponIds: readonly RandomWeaponId[],
  baseHpFraction = 1,
): UpgradeContext {
  return {
    runLevel,
    currentWave: Math.max(1, runLevel * 2 - 1),
    ownedWeapons: [
      weapon('auto-cannon', 'Auto Cannon'),
      ...ownedRandomWeaponIds.map((id) => weapon(id)),
    ],
    ownedRandomWeaponIds,
    activeComboIds: [],
    globalDamageLevel: 0,
    globalAttackSpeedLevel: 0,
    baseHpUpgradeLevel: 0,
    baseDamageReductionLevel: 0,
    xpGainLevel: 0,
    baseCurrentHp: 1000 * baseHpFraction,
    baseMaxHp: 1000,
  };
}

function expectWeaponOfferEveryTime(ctx: UpgradeContext): void {
  const director = new UpgradeDirectorLite();
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const options = director.generate(ctx);
    expect(options.some((option) => option.kind === 'unlock-weapon')).toBe(true);
  }
}

test('early build pity keeps a new weapon visible until loadout checkpoints are met', () => {
  expectWeaponOfferEveryTime(context(2, []));
  expectWeaponOfferEveryTime(context(4, ['lmg']));
  expectWeaponOfferEveryTime(context(5, ['lmg', 'sniper']));
  expectWeaponOfferEveryTime(context(8, ['lmg', 'sniper', 'auto-gl']));
});

test('critical base HP always keeps emergency repair in the three choices', () => {
  const director = new UpgradeDirectorLite();
  const critical = context(4, ['lmg', 'sniper'], 0.44);

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const options = director.generate(critical);
    expect(options.some((option) => option.kind === 'base-heal')).toBe(true);
  }

  const healthy = director.generate(context(4, ['lmg', 'sniper'], 1));
  expect(healthy.some((option) => option.kind === 'base-heal')).toBe(false);
});
