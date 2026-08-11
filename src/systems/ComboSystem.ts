import type { DamageContext, DamageResult, Targetable } from '../combat/types';

export class ComboSystem {
  static resolveAfterHit(target: Targetable, context: DamageContext, result: DamageResult): void {
    if (!target.alive) return;

    const tags = new Set(context.tags ?? []);

    if (tags.has('EXPLOSION')) {
      this.resolveDetonation(target);
      if (!target.alive) return;
    }

    if (tags.has('HEAVY_HIT') && target.hardControlled) {
      target.applyStatus({ type: 'ARMOR_BREAK', durationMs: 4000, magnitude: 35 });
    }

    if (tags.has('LIGHTNING') && target.hasStatus('CHARGED')) {
      this.resolveOverload(target, context, result);
      if (!target.alive) return;
    }

    if (tags.has('SNIPER') && result.critical && target.hardControlled) {
      target.takeDamage(result.finalDamage * 0.75);
    }
  }

  private static resolveDetonation(target: Targetable): void {
    const burn = target.getStatus('BURN');
    if (!burn) return;

    const remainingTicks = burn.tickIntervalMs > 0
      ? Math.max(1, Math.ceil(burn.remainingMs / burn.tickIntervalMs))
      : 1;
    const detonationDamage = burn.magnitude * burn.stacks * remainingTicks * 0.35;

    target.consumeStatusStacks('BURN', 1);
    target.takeDamage(detonationDamage);
  }

  private static resolveOverload(target: Targetable, context: DamageContext, result: DamageResult): void {
    const overloadDamage = result.finalDamage * 0.35;
    target.takeDamage(overloadDamage);

    const candidates = context.comboTargets ?? [];
    let nearest: Targetable | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const candidate of candidates) {
      if (!candidate.alive || candidate.id === target.id || candidate.domain !== target.domain) continue;
      const dx = candidate.x - target.x;
      const dy = candidate.y - target.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 260 || distance >= nearestDistance) continue;
      nearest = candidate;
      nearestDistance = distance;
    }

    nearest?.takeDamage(overloadDamage);
  }
}
