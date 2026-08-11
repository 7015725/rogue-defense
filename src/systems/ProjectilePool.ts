import * as Phaser from 'phaser';
import type { DamageContext, Targetable } from '../combat/types';
import { Projectile } from '../entities/Projectile';

export class ProjectilePool {
  private readonly projectiles: Projectile[];

  constructor(private readonly scene: Phaser.Scene, initialSize = 256) {
    this.projectiles = Array.from({ length: initialSize }, () => new Projectile(scene));
  }

  get activeCount(): number {
    return this.projectiles.reduce((count, projectile) => count + (projectile.inUse ? 1 : 0), 0);
  }

  fire(
    x: number,
    y: number,
    target: Targetable,
    speed: number,
    damageContext: DamageContext,
  ): void {
    let projectile = this.projectiles.find((candidate) => !candidate.inUse);
    if (!projectile) {
      projectile = new Projectile(this.scene);
      this.projectiles.push(projectile);
    }
    projectile.fire(x, y, target, speed, damageContext);
  }

  update(deltaMs: number): void {
    for (const projectile of this.projectiles) projectile.update(deltaMs);
  }
}
