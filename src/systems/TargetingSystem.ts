import * as Phaser from 'phaser';
import type { Targetable } from '../combat/types';

export class TargetingSystem {
  static findFrontmostTarget(
    originX: number,
    originY: number,
    range: number,
    targets: readonly Targetable[],
  ): Targetable | null {
    let best: Targetable | null = null;

    for (const target of targets) {
      if (!target.alive) continue;
      if (Phaser.Math.Distance.Between(originX, originY, target.x, target.y) > range) continue;
      if (!best || target.pathProgress > best.pathProgress) best = target;
    }

    return best;
  }
}
