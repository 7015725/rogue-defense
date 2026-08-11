import * as Phaser from 'phaser';
import type { Targetable, WeaponDefinition } from '../combat/types';
import { ProjectilePool } from '../systems/ProjectilePool';
import { TargetingSystem } from '../systems/TargetingSystem';

export type WeaponState = 'IDLE' | 'TARGETING' | 'FIRING' | 'COOLDOWN' | 'EMPTY' | 'RELOADING';

export class Weapon {
  private readonly barrel: Phaser.GameObjects.Rectangle;
  private state: WeaponState = 'TARGETING';
  private ammo: number;
  private attackTimerMs = 0;
  private reloadTimerMs = 0;
  private target: Targetable | null = null;
  private levelValue = 1;
  private globalDamageMultiplier = 1;
  private globalAttackSpeedMultiplier = 1;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly projectilePool: ProjectilePool,
    readonly definition: WeaponDefinition,
    readonly x: number,
    readonly y: number,
  ) {
    this.ammo = definition.magazineSize;
    scene.add.rectangle(this.x, this.y, 90, 70, 0x475569).setStrokeStyle(4, definition.color);
    this.barrel = scene.add.rectangle(this.x, this.y - 50, 18, 100, definition.color).setOrigin(0.5, 0.88);
  }

  get id(): string { return this.definition.id; }
  get name(): string { return this.definition.name; }
  get currentAmmo(): number { return this.ammo; }
  get magazineSize(): number { return this.definition.magazineSize; }
  get currentState(): WeaponState { return this.state; }
  get level(): number { return this.levelValue; }
  get maxLevel(): number { return 10; }

  setGlobalModifiers(damageMultiplier: number, attackSpeedMultiplier: number): void {
    this.globalDamageMultiplier = Math.max(0.01, damageMultiplier);
    this.globalAttackSpeedMultiplier = Math.max(0.01, attackSpeedMultiplier);
  }

  upgradeLevel(): boolean {
    if (this.levelValue >= this.maxLevel) return false;
    this.levelValue += 1;
    return true;
  }

  update(deltaMs: number, targets: readonly Targetable[]): void {
    if (this.state === 'RELOADING') {
      this.reloadTimerMs -= deltaMs;
      if (this.reloadTimerMs <= 0) {
        this.ammo = this.definition.magazineSize;
        this.state = 'TARGETING';
      }
      return;
    }

    this.attackTimerMs = Math.max(0, this.attackTimerMs - deltaMs);

    if (!this.target?.alive || Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y) > this.definition.range) {
      this.state = 'TARGETING';
      this.target = TargetingSystem.findFrontmostTarget(this.x, this.y, this.definition.range, targets);
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
    this.attackTimerMs = this.getAttackIntervalMs();
  }

  private getAttackIntervalMs(): number {
    const levelAttackSpeedMultiplier = 1 + 0.04 * (this.levelValue - 1);
    return this.definition.attackIntervalMs / (levelAttackSpeedMultiplier * this.globalAttackSpeedMultiplier);
  }

  private getDamage(): number {
    const levelDamageMultiplier = 1 + 0.12 * (this.levelValue - 1);
    return this.definition.damage * levelDamageMultiplier * this.globalDamageMultiplier;
  }

  private fire(target: Targetable): void {
    this.ammo -= 1;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    const muzzleX = this.x + Math.cos(angle) * 78;
    const muzzleY = this.y + Math.sin(angle) * 78;

    this.projectilePool.fire(muzzleX, muzzleY, target, this.definition.projectileSpeed, {
      baseDamage: this.getDamage(),
      critChance: this.definition.critChance,
      critMultiplier: this.definition.critMultiplier,
      armorPenetration: 0,
    });

    this.scene.tweens.add({ targets: this.barrel, scaleY: 0.82, duration: 45, yoyo: true });
  }

  private startReload(): void {
    this.state = 'RELOADING';
    this.reloadTimerMs = this.definition.reloadTimeMs;
  }
}
