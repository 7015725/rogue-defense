import * as Phaser from 'phaser';
import type { Targetable, TargetingRule } from '../combat/types';

export class TargetingSystem {
  static findTarget(
    rule: TargetingRule,
    originX: number,
    originY: number,
    range: number,
    targets: readonly Targetable[],
  ): Targetable | null {
    return rule === 'highest-hp'
      ? this.findHighestHpTarget(originX, originY, range, targets)
      : this.findFrontmostTarget(originX, originY, range, targets);
  }

  static findFrontmostTarget(
    originX: number,
    originY: number,
    range: number,
    targets: readonly Targetable[],
  ): Targetable | null {
    let best: Targetable | null = null;

    for (const target of targets) {
      if (!this.isInRange(originX, originY, range, target)) continue;
      if (!best || target.pathProgress > best.pathProgress) best = target;
    }

    return best;
  }

  static findHighestHpTarget(
    originX: number,
    originY: number,
    range: number,
    targets: readonly Targetable[],
  ): Targetable | null {
    let best: Targetable | null = null;

    for (const target of targets) {
      if (!this.isInRange(originX, originY, range, target)) continue;
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
  ): Targetable | null {
    let best: Targetable | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const target of targets) {
      if (excludedIds.has(target.id)) continue;
      if (!this.isInRange(originX, originY, range, target)) continue;

      const distance = Phaser.Math.Distance.Between(originX, originY, target.x, target.y);
      if (distance < bestDistance) {
        best = target;
        bestDistance = distance;
      }
    }

    return best;
  }

  private static isInRange(
    originX: number,
    originY: number,
    range: number,
    target: Targetable,
  ): boolean {
    return target.alive && Phaser.Math.Distance.Between(originX, originY, target.x, target.y) <= range;
  }
}
