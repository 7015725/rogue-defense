import * as Phaser from 'phaser';
import type { DamageContext, Targetable } from '../combat/types';
import { DamageSystem } from '../systems/DamageSystem';

export class Projectile {
  private readonly shape: Phaser.GameObjects.Arc;
  private target: Targetable | null = null;
  private damageContext: DamageContext | null = null;
  private speed = 0;
  private active = false;
  private vx = 0;
  private vy = -1;
  private orphanTtlMs = 0;

  constructor(scene: Phaser.Scene) {
    this.shape = scene.add.circle(-100, -100, 7, 0xf8fafc).setVisible(false);
  }

  get inUse(): boolean { return this.active; }

  fire(
    x: number,
    y: number,
    target: Targetable,
    speed: number,
    damageContext: DamageContext,
  ): void {
    this.active = true;
    this.target = target;
    this.speed = speed;
    this.damageContext = damageContext;
    this.orphanTtlMs = 500;
    this.shape.setPosition(x, y).setVisible(true);
    this.refreshDirection(target.x, target.y);
  }

  update(deltaMs: number): void {
    if (!this.active || !this.damageContext) return;

    if (this.target?.alive) {
      this.refreshDirection(this.target.x, this.target.y);
      const distance = Phaser.Math.Distance.Between(this.shape.x, this.shape.y, this.target.x, this.target.y);
      const step = this.speed * (deltaMs / 1000);
      if (distance <= Math.max(step, 18)) {
        DamageSystem.apply(this.target, this.damageContext);
        this.release();
        return;
      }
    } else {
      this.target = null;
      this.orphanTtlMs -= deltaMs;
      if (this.orphanTtlMs <= 0) {
        this.release();
        return;
      }
    }

    const step = this.speed * (deltaMs / 1000);
    this.shape.x += this.vx * step;
    this.shape.y += this.vy * step;
  }

  release(): void {
    this.active = false;
    this.target = null;
    this.damageContext = null;
    this.shape.setVisible(false).setPosition(-100, -100);
  }

  private refreshDirection(targetX: number, targetY: number): void {
    const angle = Phaser.Math.Angle.Between(this.shape.x, this.shape.y, targetX, targetY);
    this.vx = Math.cos(angle);
    this.vy = Math.sin(angle);
  }
}
