import type { DamageContext, DamageResult, Targetable } from '../combat/types';

export class DamageSystem {
  static calculate(target: Targetable, context: DamageContext): DamageResult {
    const critical = Math.random() < context.critChance;
    const rawDamage = context.baseDamage * (critical ? context.critMultiplier : 1);
    const effectiveArmor = Math.max(0, target.armor - context.armorPenetration);
    const reduction = effectiveArmor / (effectiveArmor + 100);
    const finalDamage = Math.max(1, rawDamage * (1 - reduction));

    return { rawDamage, finalDamage, critical };
  }

  static apply(target: Targetable, context: DamageContext): DamageResult {
    const result = this.calculate(target, context);
    target.takeDamage(result.finalDamage);
    return result;
  }
}
