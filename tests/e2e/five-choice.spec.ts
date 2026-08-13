import { expect, test } from '@playwright/test';
import type { RandomWeaponId } from '../../src/combat/constants';
import {
  UpgradeDirectorLite,
  type OwnedWeaponSnapshot,
  type UpgradeContext,
} from '../../src/upgrades/UpgradeDirectorLite';

function weapon(id: string, level = 1): OwnedWeaponSnapshot {
  return { id, name: id, level, currentHp: 500, maxHp: 500 };
}

function context(
  runLevel: number,
  ownedRandomWeaponIds: readonly RandomWeaponId[],
  baseHpFraction = 1,
): UpgradeContext {
  return {
    runLevel,
    currentWave: Math.max(1, runLevel * 2 - 1),
    ownedWeapons: [weapon('auto-cannon'), ...ownedRandomWeaponIds.map((id) => weapon(id))],
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

test('upgrade director produces five choices while capping repeated categories', () => {
  const director = new UpgradeDirectorLite();
  const fullLoadout = context(12, ['lmg', 'sniper', 'auto-gl', 'tesla']);

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const options = director.generate(fullLoadout);
    expect(options).toHaveLength(5);
    expect(new Set(options.map((option) => option.id)).size).toBe(5);
    expect(options.filter((option) => option.kind === 'weapon-level').length).toBeLessThanOrEqual(2);
    expect(options.filter((option) => option.kind === 'unlock-weapon').length).toBeLessThanOrEqual(1);
    expect(options.filter((option) => option.kind === 'combo').length).toBeLessThanOrEqual(1);
  }
});

test('five choices preserve early weapon pity and critical base repair', () => {
  const director = new UpgradeDirectorLite();
  const critical = context(4, ['lmg'], 0.44);

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const options = director.generate(critical);
    expect(options).toHaveLength(5);
    expect(options.some((option) => option.kind === 'unlock-weapon')).toBe(true);
    expect(options.some((option) => option.kind === 'base-heal')).toBe(true);
  }
});
