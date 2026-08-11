import type { EnemyDefinition, WeaponDefinition } from './types';

export const BATTLEFIELD_WIDTH = 1000;
export const BATTLEFIELD_HEIGHT = 1600;

export const ENEMY_SPAWN_Y = 80;
export const BASE_ATTACK_Y = 1370;
export const BASE_X = BATTLEFIELD_WIDTH / 2;
export const BASE_Y = 1490;
export const TURRET_Y = 1435;

export const LANE_OFFSETS = [-160, -80, 0, 80, 160] as const;

export const WAVE_DURATION_MS = 30_000;
export const WAVE_SPAWN_WINDOW_MS = 24_000;

export const TEST_WAVE_COMPOSITIONS = [
  { infantry: 8, heavy: 0 },
  { infantry: 9, heavy: 0 },
  { infantry: 11, heavy: 0 },
  { infantry: 13, heavy: 0 },
  { infantry: 15, heavy: 0 },
  { infantry: 14, heavy: 1 },
  { infantry: 15, heavy: 2 },
  { infantry: 16, heavy: 2 },
  { infantry: 17, heavy: 3 },
] as const;

export const BASE_MAX_HP = 1000;

export const INFANTRY: EnemyDefinition = {
  hp: 80,
  armor: 0,
  armorGrade: 'UNARMORED',
  moveSpeed: 52,
  attackDamage: 12,
  attackIntervalMs: 1200,
  xp: 5,
  credits: 2,
  size: 42,
  color: 0x64748b,
};

export const HEAVY: EnemyDefinition = {
  hp: 220,
  armor: 100,
  armorGrade: 'HEAVY',
  moveSpeed: 36,
  attackDamage: 22,
  attackIntervalMs: 1500,
  xp: 14,
  credits: 6,
  size: 58,
  color: 0x475569,
};

export const BOSS: EnemyDefinition = {
  hp: 1800,
  armor: 20,
  armorGrade: 'LIGHT',
  moveSpeed: 50,
  attackDamage: 32,
  attackIntervalMs: 1500,
  xp: 100,
  credits: 100,
  size: 92,
  color: 0xb45309,
};

export const AUTO_CANNON: WeaponDefinition = {
  id: 'auto-cannon',
  name: 'Auto Cannon',
  mode: 'projectile',
  targetingRule: 'frontmost',
  damage: 18,
  attackIntervalMs: 500,
  range: 720,
  projectileSpeed: 900,
  magazineSize: 12,
  reloadTimeMs: 1600,
  critChance: 0.05,
  critMultiplier: 2,
  color: 0xe2e8f0,
};

export const LMG: WeaponDefinition = {
  id: 'lmg',
  name: 'LMG Nest',
  mode: 'projectile',
  targetingRule: 'frontmost',
  damage: 8,
  attackIntervalMs: 100,
  range: 620,
  projectileSpeed: 1000,
  magazineSize: 60,
  reloadTimeMs: 2400,
  critChance: 0.05,
  critMultiplier: 2,
  color: 0xfacc15,
};

export const SHOTGUN: WeaponDefinition = {
  id: 'shotgun',
  name: 'Tac-Shotgun Bunker',
  mode: 'shotgun',
  targetingRule: 'frontmost',
  damage: 5,
  attackIntervalMs: 1050,
  range: 430,
  projectileSpeed: 0,
  magazineSize: 8,
  reloadTimeMs: 2300,
  critChance: 0.05,
  critMultiplier: 2,
  color: 0xfb7185,
  coneAngleDeg: 58,
  pelletCount: 12,
};

export const SNIPER: WeaponDefinition = {
  id: 'sniper',
  name: 'Bolt-Action Sniper',
  mode: 'projectile',
  targetingRule: 'highest-hp',
  damage: 100,
  attackIntervalMs: 2300,
  range: 1500,
  projectileSpeed: 1800,
  magazineSize: 5,
  reloadTimeMs: 3000,
  critChance: 0.25,
  critMultiplier: 2.5,
  color: 0x93c5fd,
};

export const AUTO_GL: WeaponDefinition = {
  id: 'auto-gl',
  name: 'Auto-GL',
  mode: 'grenade',
  targetingRule: 'frontmost',
  damage: 55,
  attackIntervalMs: 1350,
  range: 900,
  projectileSpeed: 0,
  magazineSize: 8,
  reloadTimeMs: 2700,
  critChance: 0.05,
  critMultiplier: 2,
  color: 0xf97316,
  aoeRadius: 140,
  impactDelayMs: 850,
};

export const TESLA: WeaponDefinition = {
  id: 'tesla',
  name: 'Tesla Coil',
  mode: 'tesla',
  targetingRule: 'frontmost',
  damage: 20,
  attackIntervalMs: 1600,
  range: 520,
  projectileSpeed: 0,
  magazineSize: 0,
  reloadTimeMs: 0,
  critChance: 0,
  critMultiplier: 1,
  color: 0x67e8f9,
  chainCount: 3,
  chainRange: 230,
  stunMs: 300,
};

export const RANDOM_WEAPON_DEFINITIONS = {
  lmg: LMG,
  shotgun: SHOTGUN,
  sniper: SNIPER,
  'auto-gl': AUTO_GL,
  tesla: TESLA,
} as const satisfies Record<string, WeaponDefinition>;

export type RandomWeaponId = keyof typeof RANDOM_WEAPON_DEFINITIONS;

export const RANDOM_WEAPON_IDS = Object.keys(RANDOM_WEAPON_DEFINITIONS) as RandomWeaponId[];

export const RANDOM_WEAPON_SLOT_POSITIONS = [
  { x: 315, y: TURRET_Y + 20 },
  { x: 685, y: TURRET_Y + 20 },
  { x: 175, y: TURRET_Y + 60 },
  { x: 825, y: TURRET_Y + 60 },
] as const;
