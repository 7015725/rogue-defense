import type { Targetable, TargetDomain, TargetingRule } from '../combat/types';

export class TargetingSystem {
  static findTarget(
    rule: TargetingRule,
    originX: number,
    originY: number,
    range: number,
    targets: readonly Targetable[],
    targetDomains: readonly TargetDomain[],
  ): Targetable | null {
    return rule === 'highest-hp'
      ? this.findHighestHpTarget(originX, originY, range, targets, targetDomains)
      : this.findFrontmostTarget(originX, originY, range, targets, targetDomains);
  }

  static findFrontmostTarget(
    originX: number,
    originY: number,
    range: number,
    targets: readonly Targetable[],
    targetDomains: readonly TargetDomain[],
  ): Targetable | null {
    let best: Targetable | null = null;
    const rangeSquared = range * range;

    for (const target of targets) {
      if (!this.isLegalTargetSquared(originX, originY, rangeSquared, target, targetDomains)) continue;
      if (!best || target.pathProgress > best.pathProgress) best = target;
    }

    return best;
  }

  static findHighestHpTarget(
    originX: number,
    originY: number,
    range: number,
    targets: readonly Targetable[],
    targetDomains: readonly TargetDomain[],
  ): Targetable | null {
    let best: Targetable | null = null;
    const rangeSquared = range * range;

    for (const target of targets) {
      if (!this.isLegalTargetSquared(originX, originY, rangeSquared, target, targetDomains)) continue;
      if (!best || target.currentHp > best.currentHp) best = target;
    }

    return best;
  }

  static findNearestTarget(
    originX: number,
    originY: number,
    range: number,
    targets: readonly Targetable[],
    excludedIds: ReadonlySet<number> = new Set<number>(),
    targetDomains: readonly TargetDomain[] = ['GROUND', 'AIR'],
  ): Targetable | null {
    let best: Targetable | null = null;
    let bestDistanceSquared = Number.POSITIVE_INFINITY;
    const rangeSquared = range * range;

    for (const target of targets) {
      if (excludedIds.has(target.id)) continue;
      if (!this.canTarget(target, targetDomains)) continue;

      const distanceSquared = this.distanceSquared(originX, originY, target.x, target.y);
      if (distanceSquared > rangeSquared || distanceSquared >= bestDistanceSquared) continue;
      best = target;
      bestDistanceSquared = distanceSquared;
    }

    return best;
  }

  static canTarget(target: Targetable, targetDomains: readonly TargetDomain[]): boolean {
    return target.alive && targetDomains.includes(target.domain);
  }

  private static isLegalTargetSquared(
    originX: number,
    originY: number,
    rangeSquared: number,
    target: Targetable,
    targetDomains: readonly TargetDomain[],
  ): boolean {
    return this.canTarget(target, targetDomains)
      && this.distanceSquared(originX, originY, target.x, target.y) <= rangeSquared;
  }

  private static distanceSquared(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
  }
}
