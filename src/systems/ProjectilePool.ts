import * as Phaser from 'phaser';
import type { DamageContext, Targetable } from '../combat/types';
import { Projectile } from '../entities/Projectile';

export class ProjectilePool {
  private readonly projectiles: Projectile[];
  private activeCountValue = 0;

  constructor(private readonly scene: Phaser.Scene, initialSize = 256) {
    this.projectiles = Array.from({ length: initialSize }, () => new Projectile(scene));
  }

  get activeCount(): number {
    return this.activeCountValue;
  }

  get size(): number {
    return this.projectiles.length;
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
    let active = 0;
    for (const projectile of this.projectiles) {
      projectile.update(deltaMs);
      if (projectile.inUse) active += 1;
    }
    this.activeCountValue = active;
  }

  clear(): void {
    for (const projectile of this.projectiles) projectile.release();
    this.activeCountValue = 0;
  }
}
