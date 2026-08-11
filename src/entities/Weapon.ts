import * as Phaser from 'phaser';
import type { DamageContext, Targetable, WeaponDefinition } from '../combat/types';
import { DamageSystem } from '../systems/DamageSystem';
import { ProjectilePool } from '../systems/ProjectilePool';
import { TargetingSystem } from '../systems/TargetingSystem';

export type WeaponState = 'IDLE' | 'TARGETING' | 'FIRING' | 'COOLDOWN' | 'EMPTY' | 'RELOADING';

interface PendingGrenade {
  x: number;
  y: number;
  timerMs: number;
  marker: Phaser.GameObjects.Arc;
}

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
  private readonly pendingGrenades: PendingGrenade[] = [];

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
  get ammoLabel(): string {
    return this.definition.magazineSize > 0 ? `${this.ammo}/${this.definition.magazineSize}` : '∞';
  }
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
    this.updatePendingGrenades(deltaMs, targets);

    if (this.state === 'RELOADING') {
      this.reloadTimerMs -= deltaMs;
      if (this.reloadTimerMs <= 0) {
        this.ammo = this.definition.magazineSize;
        this.state = 'TARGETING';
      }
      return;
    }

    this.attackTimerMs = Math.max(0, this.attackTimerMs - deltaMs);

    const needsNewTarget = this.definition.targetingRule === 'highest-hp'
      || !this.target?.alive
      || Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y) > this.definition.range;

    if (needsNewTarget) {
      this.state = 'TARGETING';
      this.target = TargetingSystem.findTarget(
        this.definition.targetingRule,
        this.x,
        this.y,
        this.definition.range,
        targets,
      );
    }

    if (!this.target) {
      this.state = 'IDLE';
      return;
    }

    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    this.barrel.setRotation(angle + Math.PI / 2);

    if (this.definition.magazineSize > 0 && this.ammo <= 0) {
      this.state = 'EMPTY';
      this.startReload();
      return;
    }

    if (this.attackTimerMs > 0) {
      this.state = 'COOLDOWN';
      return;
    }

    this.state = 'FIRING';
    this.fire(this.target, targets);
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

  private getDamageContext(baseDamage = this.getDamage()): DamageContext {
    return {
      baseDamage,
      critChance: this.definition.critChance,
      critMultiplier: this.definition.critMultiplier,
      armorPenetration: 0,
    };
  }

  private fire(target: Targetable, targets: readonly Targetable[]): void {
    if (this.definition.magazineSize > 0) this.ammo -= 1;

    switch (this.definition.mode) {
      case 'shotgun':
        this.fireShotgun(target, targets);
        break;
      case 'grenade':
        this.fireGrenade(target);
        break;
      case 'tesla':
        this.fireTesla(target, targets);
        break;
      case 'projectile':
      default:
        this.fireProjectile(target);
        break;
    }

    this.scene.tweens.add({ targets: this.barrel, scaleY: 0.82, duration: 45, yoyo: true });
  }

  private fireProjectile(target: Targetable): void {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    const muzzleX = this.x + Math.cos(angle) * 78;
    const muzzleY = this.y + Math.sin(angle) * 78;

    this.projectilePool.fire(
      muzzleX,
      muzzleY,
      target,
      this.definition.projectileSpeed,
      this.getDamageContext(),
    );
  }

  private fireShotgun(target: Targetable, targets: readonly Targetable[]): void {
    const coneAngle = Phaser.Math.DegToRad(this.definition.coneAngleDeg ?? 55);
    const pelletCount = this.definition.pelletCount ?? 12;
    const aimAngle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);

    for (const candidate of targets) {
      if (!candidate.alive) continue;

      const distance = Phaser.Math.Distance.Between(this.x, this.y, candidate.x, candidate.y);
      if (distance > this.definition.range) continue;

      const candidateAngle = Phaser.Math.Angle.Between(this.x, this.y, candidate.x, candidate.y);
      const angleDelta = Math.abs(Phaser.Math.Angle.Wrap(candidateAngle - aimAngle));
      if (angleDelta > coneAngle / 2) continue;

      const closeness = Phaser.Math.Clamp(1 - distance / this.definition.range, 0, 1);
      const hitRatio = 0.25 + 0.75 * closeness;
      const pelletsHit = Phaser.Math.Clamp(Math.round(pelletCount * hitRatio), 1, pelletCount);
      DamageSystem.apply(candidate, this.getDamageContext(this.getDamage() * pelletsHit));
    }

    const graphics = this.scene.add.graphics().setDepth(4);
    graphics.lineStyle(6, this.definition.color, 0.55);
    const leftAngle = aimAngle - coneAngle / 2;
    const rightAngle = aimAngle + coneAngle / 2;
    graphics.beginPath();
    graphics.moveTo(this.x, this.y);
    graphics.lineTo(
      this.x + Math.cos(leftAngle) * this.definition.range,
      this.y + Math.sin(leftAngle) * this.definition.range,
    );
    graphics.moveTo(this.x, this.y);
    graphics.lineTo(
      this.x + Math.cos(rightAngle) * this.definition.range,
      this.y + Math.sin(rightAngle) * this.definition.range,
    );
    graphics.strokePath();
    this.scene.tweens.add({ targets: graphics, alpha: 0, duration: 90, onComplete: () => graphics.destroy() });
  }

  private fireGrenade(target: Targetable): void {
    const x = target.x;
    const y = target.y;
    const marker = this.scene.add.circle(x, y, 18, this.definition.color, 0.35)
      .setStrokeStyle(4, this.definition.color, 0.85)
      .setDepth(3);

    this.pendingGrenades.push({
      x,
      y,
      timerMs: this.definition.impactDelayMs ?? 800,
      marker,
    });
  }

  private updatePendingGrenades(deltaMs: number, targets: readonly Targetable[]): void {
    for (let index = this.pendingGrenades.length - 1; index >= 0; index -= 1) {
      const grenade = this.pendingGrenades[index];
      grenade.timerMs -= deltaMs;
      if (grenade.timerMs > 0) continue;

      const radius = this.definition.aoeRadius ?? 120;
      for (const target of targets) {
        if (!target.alive) continue;
        if (Phaser.Math.Distance.Between(grenade.x, grenade.y, target.x, target.y) <= radius) {
          DamageSystem.apply(target, this.getDamageContext());
        }
      }

      grenade.marker.destroy();
      const blast = this.scene.add.circle(grenade.x, grenade.y, radius, this.definition.color, 0.25)
        .setStrokeStyle(5, this.definition.color, 0.8)
        .setDepth(5);
      this.scene.tweens.add({
        targets: blast,
        scale: 1.2,
        alpha: 0,
        duration: 180,
        onComplete: () => blast.destroy(),
      });
      this.pendingGrenades.splice(index, 1);
    }
  }

  private fireTesla(primary: Targetable, targets: readonly Targetable[]): void {
    const chainCount = Math.max(1, this.definition.chainCount ?? 3);
    const chainRange = this.definition.chainRange ?? 220;
    const stunMs = this.definition.stunMs ?? 0;
    const hitIds = new Set<number>();
    let current: Targetable | null = primary;
    let fromX = this.x;
    let fromY = this.y;

    for (let index = 0; index < chainCount && current; index += 1) {
      const hitTarget: Targetable = current;
      hitIds.add(hitTarget.id);
      DamageSystem.apply(hitTarget, this.getDamageContext(this.getDamage() * Math.pow(0.85, index)));
      hitTarget.applyStun(stunMs);
      this.drawTeslaArc(fromX, fromY, hitTarget.x, hitTarget.y);

      fromX = hitTarget.x;
      fromY = hitTarget.y;
      current = TargetingSystem.findNearestTarget(fromX, fromY, chainRange, targets, hitIds);
    }
  }

  private drawTeslaArc(fromX: number, fromY: number, toX: number, toY: number): void {
    const graphics = this.scene.add.graphics().setDepth(6);
    graphics.lineStyle(7, this.definition.color, 0.9);
    graphics.beginPath();
    graphics.moveTo(fromX, fromY);
    graphics.lineTo(toX, toY);
    graphics.strokePath();
    this.scene.tweens.add({ targets: graphics, alpha: 0, duration: 110, onComplete: () => graphics.destroy() });
  }

  private startReload(): void {
    this.state = 'RELOADING';
    this.reloadTimerMs = this.definition.reloadTimeMs;
  }
}
