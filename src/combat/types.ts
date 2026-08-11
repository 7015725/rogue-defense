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
  takeDamage(amount: number): void;
}
