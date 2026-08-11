export type Team = 'player' | 'enemy';

export type ArmorGrade = 'UNARMORED' | 'LIGHT' | 'MEDIUM' | 'HEAVY';
export type TargetDomain = 'GROUND' | 'AIR';
export type EnemyKind = 'infantry' | 'heavy' | 'flying' | 'boss';

export type StatusType =
  | 'BURN'
  | 'SLOW'
  | 'FREEZE'
  | 'STUN'
  | 'ARMOR_BREAK'
  | 'CHARGED'
  | 'SUPPRESSED';

export interface StatusApplication {
  type: StatusType;
  durationMs: number;
  magnitude?: number;
  stacks?: number;
  maxStacks?: number;
  tickIntervalMs?: number;
  sourceWeaponId?: string;
}

export interface StatusSnapshot {
  type: StatusType;
  remainingMs: number;
  magnitude: number;
  stacks: number;
  tickIntervalMs: number;
}

export type ComboId =
  | 'DETONATION'
  | 'CONCUSSIVE_BREAK'
  | 'OVERLOAD'
  | 'CONTROL_EXECUTION';

export type DamageTag =
  | 'PROJECTILE'
  | 'SHOTGUN'
  | 'EXPLOSION'
  | 'LIGHTNING'
  | 'HEAVY_HIT'
  | 'SNIPER';

export interface DamageContext {
  baseDamage: number;
  critChance: number;
  critMultiplier: number;
  armorPenetration: number;
  sourceWeaponId?: string;
  tags?: readonly DamageTag[];
  statusApplications?: readonly StatusApplication[];
  comboTargets?: readonly Targetable[];
  enabledCombos?: readonly ComboId[];
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
  readonly domain: TargetDomain;
  readonly armor: number;
  readonly armorGrade: ArmorGrade;
  readonly currentHp: number;
  readonly maxHp: number;
  readonly hardControlled: boolean;
  takeDamage(amount: number): void;
  applyStatus(application: StatusApplication): void;
  hasStatus(type: StatusType): boolean;
  getStatus(type: StatusType): StatusSnapshot | null;
  consumeStatusStacks(type: StatusType, count: number): number;
}

export interface EnemyDefinition {
  readonly hp: number;
  readonly armor: number;
  readonly armorGrade: ArmorGrade;
  readonly domain: TargetDomain;
  readonly moveSpeed: number;
  readonly attackDamage: number;
  readonly attackIntervalMs: number;
  readonly xp: number;
  readonly credits: number;
  readonly size: number;
  readonly color: number;
}

export type WeaponMode = 'projectile' | 'shotgun' | 'grenade' | 'tesla' | 'tesla-radial';
export type TargetingRule = 'frontmost' | 'highest-hp';

export interface WeaponDefinition {
  readonly id: string;
  readonly name: string;
  readonly mode: WeaponMode;
  readonly targetingRule: TargetingRule;
  readonly targetDomains: readonly TargetDomain[];
  readonly damage: number;
  readonly attackIntervalMs: number;
  readonly range: number;
  readonly projectileSpeed: number;
  readonly magazineSize: number;
  readonly reloadTimeMs: number;
  readonly critChance: number;
  readonly critMultiplier: number;
  readonly maxHp: number;
  readonly autoRepairPerSecond: number;
  readonly color: number;
  readonly coneAngleDeg?: number;
  readonly pelletCount?: number;
  readonly aoeRadius?: number;
  readonly impactDelayMs?: number;
  readonly chainCount?: number;
  readonly chainRange?: number;
  readonly stunMs?: number;
}
