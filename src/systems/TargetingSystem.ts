import * as Phaser from 'phaser';
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

    for (const target of targets) {
      if (!this.isLegalTarget(originX, originY, range, target, targetDomains)) continue;
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

    for (const target of targets) {
      if (!this.isLegalTarget(originX, originY, range, target, targetDomains)) continue;
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
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const target of targets) {
      if (excludedIds.has(target.id)) continue;
      if (!this.isLegalTarget(originX, originY, range, target, targetDomains)) continue;

      const distance = Phaser.Math.Distance.Between(originX, originY, target.x, target.y);
      if (distance < bestDistance) {
        best = target;
        bestDistance = distance;
      }
    }

    return best;
  }

  static canTarget(target: Targetable, targetDomains: readonly TargetDomain[]): boolean {
    return target.alive && targetDomains.includes(target.domain);
  }

  private static isLegalTarget(
    originX: number,
    originY: number,
    range: number,
    target: Targetable,
    targetDomains: readonly TargetDomain[],
  ): boolean {
    return this.canTarget(target, targetDomains)
      && Phaser.Math.Distance.Between(originX, originY, target.x, target.y) <= range;
  }
}
