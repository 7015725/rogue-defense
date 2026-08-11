import * as Phaser from 'phaser';
import type { DamageContext, Targetable } from '../combat/types';
import { Projectile } from '../entities/Projectile';

export class ProjectilePool {
  private readonly projectiles: Projectile[] = [];
  private readonly freeProjectiles: Projectile[] = [];
  private readonly activeProjectiles: Projectile[] = [];
  private activeCountValue = 0;

  constructor(private readonly scene: Phaser.Scene, initialSize = 256) {
    for (let index = 0; index < initialSize; index += 1) {
      const projectile = new Projectile(scene);
      this.projectiles.push(projectile);
      this.freeProjectiles.push(projectile);
    }
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
    let projectile = this.freeProjectiles.pop();
    if (!projectile) {
      projectile = new Projectile(this.scene);
      this.projectiles.push(projectile);
    }
    projectile.fire(x, y, target, speed, damageContext);
    this.activeProjectiles.push(projectile);
    this.activeCountValue = this.activeProjectiles.length;
  }

  update(deltaMs: number): void {
    let writeIndex = 0;
    for (let index = 0; index < this.activeProjectiles.length; index += 1) {
      const projectile = this.activeProjectiles[index];
      projectile.update(deltaMs);
      if (projectile.inUse) {
        this.activeProjectiles[writeIndex] = projectile;
        writeIndex += 1;
      } else {
        this.freeProjectiles.push(projectile);
      }
    }
    this.activeProjectiles.length = writeIndex;
    this.activeCountValue = writeIndex;
  }

  clear(): void {
    for (const projectile of this.activeProjectiles) {
      projectile.release();
      this.freeProjectiles.push(projectile);
    }
    this.activeProjectiles.length = 0;
    this.activeCountValue = 0;
  }
}
