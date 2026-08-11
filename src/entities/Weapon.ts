import * as Phaser from 'phaser';
import { AUTO_CANNON, TURRET_X, TURRET_Y } from '../combat/constants';
import type { Targetable } from '../combat/types';
import { ProjectilePool } from '../systems/ProjectilePool';
import { TargetingSystem } from '../systems/TargetingSystem';

export type WeaponState = 'IDLE' | 'TARGETING' | 'FIRING' | 'COOLDOWN' | 'EMPTY' | 'RELOADING';

export class Weapon {
  readonly x = TURRET_X;
  readonly y = TURRET_Y;

  private readonly barrel: Phaser.GameObjects.Rectangle;
  private state: WeaponState = 'TARGETING';
  private ammo = AUTO_CANNON.magazineSize;
  private attackTimerMs = 0;
  private reloadTimerMs = 0;
  private target: Targetable | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly projectilePool: ProjectilePool,
  ) {
    scene.add.rectangle(this.x, this.y, 90, 70, 0x475569).setStrokeStyle(4, 0xcbd5e1);
    this.barrel = scene.add.rectangle(this.x, this.y - 50, 18, 100, 0xe2e8f0).setOrigin(0.5, 0.88);
  }

  get currentAmmo(): number { return this.ammo; }
  get currentState(): WeaponState { return this.state; }

  update(deltaMs: number, targets: readonly Targetable[]): void {
    if (this.state === 'RELOADING') {
      this.reloadTimerMs -= deltaMs;
      if (this.reloadTimerMs <= 0) {
        this.ammo = AUTO_CANNON.magazineSize;
        this.state = 'TARGETING';
      }
      return;
    }

    this.attackTimerMs = Math.max(0, this.attackTimerMs - deltaMs);

    if (!this.target?.alive || Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y) > AUTO_CANNON.range) {
      this.state = 'TARGETING';
      this.target = TargetingSystem.findFrontmostTarget(this.x, this.y, AUTO_CANNON.range, targets);
    }

    if (!this.target) {
      this.state = 'IDLE';
      return;
    }

    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    this.barrel.setRotation(angle + Math.PI / 2);

    if (this.ammo <= 0) {
      this.state = 'EMPTY';
      this.startReload();
      return;
    }

    if (this.attackTimerMs > 0) {
      this.state = 'COOLDOWN';
      return;
    }

    this.state = 'FIRING';
    this.fire(this.target);
    this.attackTimerMs = AUTO_CANNON.attackIntervalMs;
  }

  private fire(target: Targetable): void {
    this.ammo -= 1;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    const muzzleX = this.x + Math.cos(angle) * 78;
    const muzzleY = this.y + Math.sin(angle) * 78;

    this.projectilePool.fire(muzzleX, muzzleY, target, AUTO_CANNON.projectileSpeed, {
      baseDamage: AUTO_CANNON.damage,
      critChance: AUTO_CANNON.critChance,
      critMultiplier: AUTO_CANNON.critMultiplier,
      armorPenetration: 0,
    });

    this.scene.tweens.add({ targets: this.barrel, scaleY: 0.82, duration: 45, yoyo: true });
  }

  private startReload(): void {
    this.state = 'RELOADING';
    this.reloadTimerMs = AUTO_CANNON.reloadTimeMs;
  }
}
