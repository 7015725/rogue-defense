export type Team = 'player' | 'enemy';

export interface DamageContext {
  baseDamage: number;
  critChance: number;
  critMultiplier: number;
  armorPenetration: number;
}

export interface DamageResult {
  rawDamage: number;
  finalDamage: number;
  critical: boolean;
}

export interface Targetable {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly alive: boolean;
  readonly pathProgress: number;
  readonly armor: number;
  readonly currentHp: number;
  readonly maxHp: number;
  takeDamage(amount: number): void;
  applyStun(durationMs: number): void;
}

export type WeaponMode = 'projectile' | 'shotgun' | 'grenade' | 'tesla';
export type TargetingRule = 'frontmost' | 'highest-hp';

export interface WeaponDefinition {
  readonly id: string;
  readonly name: string;
  readonly mode: WeaponMode;
  readonly targetingRule: TargetingRule;
  readonly damage: number;
  readonly attackIntervalMs: number;
  readonly range: number;
  readonly projectileSpeed: number;
  readonly magazineSize: number;
  readonly reloadTimeMs: number;
  readonly critChance: number;
  readonly critMultiplier: number;
  readonly color: number;
  readonly coneAngleDeg?: number;
  readonly pelletCount?: number;
  readonly aoeRadius?: number;
  readonly impactDelayMs?: number;
  readonly chainCount?: number;
  readonly chainRange?: number;
  readonly stunMs?: number;
}
