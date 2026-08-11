export const BATTLEFIELD_WIDTH = 1000;
export const BATTLEFIELD_HEIGHT = 1600;

export const ENEMY_SPAWN_Y = 80;
export const BASE_ATTACK_Y = 1370;
export const BASE_X = BATTLEFIELD_WIDTH / 2;
export const BASE_Y = 1490;
export const TURRET_X = BATTLEFIELD_WIDTH / 2;
export const TURRET_Y = 1435;

export const LANE_OFFSETS = [-160, -80, 0, 80, 160] as const;

export const WAVE_DURATION_MS = 30_000;
export const WAVE_SPAWN_WINDOW_MS = 24_000;

export const TEST_WAVE_COUNTS = [8, 9, 11, 13, 15, 17, 19, 21, 24] as const;

export const BASE_MAX_HP = 1000;

export const INFANTRY = {
  hp: 80,
  armor: 0,
  moveSpeed: 52,
  attackDamage: 12,
  attackIntervalMs: 1200,
} as const;

export const BOSS = {
  hp: 1800,
  armor: 20,
  moveSpeed: 50,
  attackDamage: 32,
  attackIntervalMs: 1500,
} as const;

export const AUTO_CANNON = {
  damage: 18,
  attackIntervalMs: 500,
  range: 720,
  projectileSpeed: 900,
  magazineSize: 12,
  reloadTimeMs: 1600,
  critChance: 0.05,
  critMultiplier: 2,
} as const;
