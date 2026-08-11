import type { EnemyDefinition, WeaponDefinition } from './types';

export const BATTLEFIELD_WIDTH = 1000;
export const BATTLEFIELD_HEIGHT = 1600;

export const ENEMY_SPAWN_Y = 80;
export const BASE_ATTACK_Y = 1370;
export const BASE_X = BATTLEFIELD_WIDTH / 2;
export const BASE_Y = 1490;
export const TURRET_Y = 1435;

export const LANE_OFFSETS = [-160, -80, 0, 80, 160] as const;
export const AIR_LANE_OFFSETS = [-260, -130, 0, 130, 260] as const;

export const WAVE_DURATION_MS = 30_000;
export const WAVE_SPAWN_WINDOW_MS = 24_000;
export const WAVE20_AIR_ESCORT_COUNT = 6;
export const WAVE30_AIR_ESCORT_COUNT = 8;

export const TEST_WAVE_COMPOSITIONS = [
  { infantry: 8, heavy: 0, flying: 0 },
  { infantry: 9, heavy: 0, flying: 0 },
  { infantry: 11, heavy: 0, flying: 0 },
  { infantry: 13, heavy: 0, flying: 0 },
  { infantry: 15, heavy: 0, flying: 0 },
  { infantry: 14, heavy: 1, flying: 0 },
  { infantry: 15, heavy: 2, flying: 0 },
  { infantry: 16, heavy: 2, flying: 0 },
  { infantry: 17, heavy: 3, flying: 0 },
  null,
  { infantry: 18, heavy: 2, flying: 0 },
  { infantry: 19, heavy: 2, flying: 0 },
  { infantry: 20, heavy: 3, flying: 0 },
  { infantry: 21, heavy: 3, flying: 0 },
  { infantry: 22, heavy: 3, flying: 0 },
  { infantry: 22, heavy: 4, flying: 0 },
  { infantry: 23, heavy: 4, flying: 0 },
  { infantry: 24, heavy: 4, flying: 0 },
  { infantry: 25, heavy: 5, flying: 0 },
  null,
  { infantry: 24, heavy: 4, flying: 2 },
  { infantry: 25, heavy: 4, flying: 2 },
  { infantry: 25, heavy: 5, flying: 3 },
  { infantry: 26, heavy: 5, flying: 3 },
  { infantry: 27, heavy: 5, flying: 3 },
  { infantry: 27, heavy: 6, flying: 4 },
  { infantry: 28, heavy: 6, flying: 4 },
  { infantry: 29, heavy: 6, flying: 5 },
  { infantry: 30, heavy: 7, flying: 5 },
] as const;

export const BASE_MAX_HP = 1000;

export const INFANTRY: EnemyDefinition = {
  hp: 75,
  armor: 0,
  armorGrade: 'UNARMORED',
  domain: 'GROUND',
  moveSpeed: 50,
  attackDamage: 11,
  attackIntervalMs: 1200,
  xp: 5,
  credits: 1,
  size: 42,
  color: 0x64748b,
};

export const HEAVY: EnemyDefinition = {
  hp: 210,
  armor: 90,
  armorGrade: 'HEAVY',
  domain: 'GROUND',
  moveSpeed: 35,
  attackDamage: 20,
  attackIntervalMs: 1500,
  xp: 14,
  credits: 3,
  size: 58,
  color: 0x475569,
};

export const FLYING: EnemyDefinition = {
  hp: 55,
  armor: 0,
  armorGrade: 'UNARMORED',
  domain: 'AIR',
  moveSpeed: 88,
  attackDamage: 7,
  attackIntervalMs: 800,
  xp: 7,
  credits: 1.5,
  size: 38,
  color: 0x38bdf8,
};

export const BOSS: EnemyDefinition = {
  hp: 2000,
  armor: 22,
  armorGrade: 'LIGHT',
  domain: 'GROUND',
  moveSpeed: 50,
  attackDamage: 32,
  attackIntervalMs: 1500,
  xp: 100,
  credits: 50,
  size: 92,
  color: 0xb45309,
};

export const AUTO_CANNON: WeaponDefinition = {
  id: 'auto-cannon',
  name: 'Auto Cannon',
  mode: 'projectile',
  targetingRule: 'frontmost',
  targetDomains: ['GROUND', 'AIR'],
  damage: 18,
  attackIntervalMs: 500,
  range: Number.POSITIVE_INFINITY,
  projectileSpeed: 900,
  magazineSize: 12,
  reloadTimeMs: 1600,
  critChance: 0.05,
  critMultiplier: 2,
  maxHp: 600,
  autoRepairPerSecond: 15,
  color: 0xe2e8f0,
};

export const LMG: WeaponDefinition = {
  id: 'lmg',
  name: 'LMG Nest',
  mode: 'projectile',
  targetingRule: 'frontmost',
  targetDomains: ['GROUND', 'AIR'],
  damage: 7,
  attackIntervalMs: 115,
  range: Number.POSITIVE_INFINITY,
  projectileSpeed: 1000,
  magazineSize: 60,
  reloadTimeMs: 2600,
  critChance: 0.05,
  critMultiplier: 2,
  maxHp: 500,
  autoRepairPerSecond: 13,
  color: 0xfacc15,
};

export const SNIPER: WeaponDefinition = {
  id: 'sniper',
  name: 'Bolt-Action Sniper',
  mode: 'projectile',
  targetingRule: 'highest-hp',
  targetDomains: ['GROUND', 'AIR'],
  damage: 100,
  attackIntervalMs: 2300,
  range: Number.POSITIVE_INFINITY,
  projectileSpeed: 1800,
  magazineSize: 5,
  reloadTimeMs: 3000,
  critChance: 0.25,
  critMultiplier: 2.5,
  maxHp: 420,
  autoRepairPerSecond: 11,
  color: 0x93c5fd,
};

export const AUTO_GL: WeaponDefinition = {
  id: 'auto-gl',
  name: 'Auto-GL',
  mode: 'grenade',
  targetingRule: 'frontmost',
  targetDomains: ['GROUND'],
  damage: 48,
  attackIntervalMs: 1500,
  range: Number.POSITIVE_INFINITY,
  projectileSpeed: 0,
  magazineSize: 8,
  reloadTimeMs: 2800,
  critChance: 0.05,
  critMultiplier: 2,
  maxHp: 480,
  autoRepairPerSecond: 12,
  color: 0xf97316,
  aoeRadius: 140,
  impactDelayMs: 900,
};

export const TESLA: WeaponDefinition = {
  id: 'tesla',
  name: 'Tesla Coil',
  mode: 'tesla',
  targetingRule: 'frontmost',
  targetDomains: ['GROUND'],
  damage: 16,
  attackIntervalMs: 1800,
  range: Number.POSITIVE_INFINITY,
  projectileSpeed: 0,
  magazineSize: 0,
  reloadTimeMs: 0,
  critChance: 0,
  critMultiplier: 1,
  maxHp: 460,
  autoRepairPerSecond: 12,
  color: 0x67e8f9,
  chainCount: 3,
  chainRange: 230,
  stunMs: 250,
};

export const RANDOM_WEAPON_DEFINITIONS = {
  lmg: LMG,
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