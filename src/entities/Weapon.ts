import * as Phaser from 'phaser';
import type { DamageContext, Targetable, TargetingRule, WeaponDefinition, WeaponMode } from '../combat/types';
import { DamageSystem } from '../systems/DamageSystem';
import { ProjectilePool } from '../systems/ProjectilePool';
import { TargetingSystem } from '../systems/TargetingSystem';
import {
  combineBranchEffects,
  getWeaponProgression,
  type WeaponBranchChoice,
  type WeaponBranchEffect,
  type WeaponBranchStage,
} from '../weapons/WeaponProgression';

export type WeaponState = 'IDLE' | 'TARGETING' | 'FIRING' | 'COOLDOWN' | 'EMPTY' | 'RELOADING';

interface PendingGrenade {
  x: number;
  y: number;
  timerMs: number;
  burstsRemaining: number;
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
  private lv5BranchId: string | null = null;
  private lv10SpecializationId: string | null = null;
  private focusTargetId: number | null = null;
  private focusShotCount = 0;

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
  get magazineSize(): number {
    if (this.definition.magazineSize <= 0) return 0;
    return Math.max(1, Math.round(this.definition.magazineSize * (this.branchEffect.magazineMultiplier ?? 1)));
  }
  get ammoLabel(): string {
    return this.magazineSize > 0 ? `${this.ammo}/${this.magazineSize}` : '∞';
  }
  get currentState(): WeaponState { return this.state; }
  get level(): number { return this.levelValue; }
  get maxLevel(): number { return 10; }
  get lv5Branch(): WeaponBranchChoice | null {
    if (!this.lv5BranchId) return null;
    return getWeaponProgression(this.id).lv5.find((choice) => choice.id === this.lv5BranchId) ?? null;
  }
  get lv10Specialization(): WeaponBranchChoice | null {
    if (!this.lv5BranchId || !this.lv10SpecializationId) return null;
    return getWeaponProgression(this.id).lv10[this.lv5BranchId]
      ?.find((choice) => choice.id === this.lv10SpecializationId) ?? null;
  }
  get progressionLabel(): string {
    const route = this.lv5Branch ? ` · ${this.lv5Branch.title}` : '';
    const specialization = this.lv10Specialization ? ` · ${this.lv10Specialization.title}` : '';
    return `${this.name} Lv${this.level}${route}${specialization}`;
  }
  get pendingBranchStage(): WeaponBranchStage | null {
    if (this.levelValue >= 5 && !this.lv5BranchId) return 5;
    if (this.levelValue >= 10 && this.lv5BranchId && !this.lv10SpecializationId) return 10;
    return null;
  }

  setGlobalModifiers(damageMultiplier: number, attackSpeedMultiplier: number): void {
    this.globalDamageMultiplier = Math.max(0.01, damageMultiplier);
    this.globalAttackSpeedMultiplier = Math.max(0.01, attackSpeedMultiplier);
  }

  upgradeLevel(): boolean {
    if (this.levelValue >= this.maxLevel) return false;
    this.levelValue += 1;
    return true;
  }

  getBranchChoices(stage: WeaponBranchStage): readonly WeaponBranchChoice[] {
    const progression = getWeaponProgression(this.id);
    if (stage === 5) return progression.lv5;
    if (!this.lv5BranchId) return [];
    return progression.lv10[this.lv5BranchId] ?? [];
  }

  selectBranch(stage: WeaponBranchStage, choiceId: string): boolean {
    const choices = this.getBranchChoices(stage);
    const choice = choices.find((candidate) => candidate.id === choiceId);
    if (!choice) return false;

    if (stage === 5) {
      if (this.levelValue < 5 || this.lv5BranchId) return false;
      this.lv5BranchId = choice.id;
    } else {
      if (this.levelValue < 10 || !this.lv5BranchId || this.lv10SpecializationId) return false;
      this.lv10SpecializationId = choice.id;
    }

    this.ammo = this.magazineSize > 0 ? Math.min(this.ammo, this.magazineSize) : 0;
    this.target = null;
    return true;
  }

  update(deltaMs: number, targets: readonly Targetable[]): void {
    this.updatePendingGrenades(deltaMs, targets);

    if (this.state === 'RELOADING') {
      this.reloadTimerMs -= deltaMs;
      if (this.reloadTimerMs <= 0) {
        this.ammo = this.magazineSize;
        this.state = 'TARGETING';
      }
      return;
    }

    this.attackTimerMs = Math.max(0, this.attackTimerMs - deltaMs);

    const range = this.getRange();
    const targetingRule = this.getTargetingRule();
    const needsNewTarget = targetingRule === 'highest-hp'
      || !this.target?.alive
      || Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y) > range;

    if (needsNewTarget) {
      this.state = 'TARGETING';
      this.target = TargetingSystem.findTarget(targetingRule, this.x, this.y, range, targets);
    }

    if (!this.target) {
      this.state = 'IDLE';
      this.resetFocus();
      return;
    }

    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    this.barrel.setRotation(angle + Math.PI / 2);

    if (this.magazineSize > 0 && this.ammo <= 0) {
      this.state = 'EMPTY';
      this.startReload();
      return;
    }

    if (this.attackTimerMs > 0) {
      this.state = 'COOLDOWN';
      return;
    }

    this.state = 'FIRING';
    this.recordFocus(this.target);
    this.fire(this.target, targets);
    this.attackTimerMs = this.getAttackIntervalMs();
  }

  private get branchEffect(): WeaponBranchEffect {
    return combineBranchEffects(this.lv5Branch?.effect, this.lv10Specialization?.effect);
  }

  private getMode(): WeaponMode {
    return this.branchEffect.modeOverride ?? this.definition.mode;
  }

  private getTargetingRule(): TargetingRule {
    return this.branchEffect.targetingRuleOverride ?? this.definition.targetingRule;
  }

  private getRange(): number {
    return this.definition.range * (this.branchEffect.rangeMultiplier ?? 1);
  }

  private getProjectileSpeed(): number {
    if (this.branchEffect.projectileSpeedOverride !== undefined) return this.branchEffect.projectileSpeedOverride;
    return this.definition.projectileSpeed * (this.branchEffect.projectileSpeedMultiplier ?? 1);
  }

  private getAttackIntervalMs(): number {
    const levelAttackSpeedMultiplier = 1 + 0.04 * (this.levelValue - 1);
    const branchAttackSpeedMultiplier = this.branchEffect.attackSpeedMultiplier ?? 1;
    return this.definition.attackIntervalMs
      / (levelAttackSpeedMultiplier * this.globalAttackSpeedMultiplier * branchAttackSpeedMultiplier);
  }

  private getDamage(): number {
    const levelDamageMultiplier = 1 + 0.12 * (this.levelValue - 1);
    const branchDamageMultiplier = this.branchEffect.damageMultiplier ?? 1;
    const focusMultiplier = this.getFocusDamageMultiplier();
    return this.definition.damage
      * levelDamageMultiplier
      * this.globalDamageMultiplier
      * branchDamageMultiplier
      * focusMultiplier;
  }

  private getDamageContext(baseDamage = this.getDamage()): DamageContext {
    return {
      baseDamage,
      critChance: Phaser.Math.Clamp(this.definition.critChance + (this.branchEffect.critChanceBonus ?? 0), 0, 1),
      critMultiplier: Math.max(1, this.definition.critMultiplier + (this.branchEffect.critMultiplierBonus ?? 0)),
      armorPenetration: Math.max(0, this.branchEffect.armorPenetrationBonus ?? 0),
    };
  }

  private fire(target: Targetable, targets: readonly Targetable[]): void {
    if (this.magazineSize > 0) this.ammo -= 1;

    switch (this.getMode()) {
      case 'shotgun':
        this.fireShotgun(target, targets);
        break;
      case 'grenade':
        this.fireGrenade(target);
        break;
      case 'tesla':
        this.fireTesla(target, targets);
        break;
      case 'tesla-radial':
        this.fireTeslaRadial(targets);
        break;
      case 'projectile':
      default:
        this.fireProjectiles(target, targets);
        break;
    }

    this.scene.tweens.add({ targets: this.barrel, scaleY: 0.82, duration: 45, yoyo: true });
  }

  private fireProjectiles(primary: Targetable, targets: readonly Targetable[]): void {
    const shotCount = Math.max(1, Math.round(this.branchEffect.multiShot ?? 1));
    const splitTargets = this.branchEffect.splitTargets ?? false;
    const usedIds = new Set<number>();

    for (let index = 0; index < shotCount; index += 1) {
      let target: Targetable | null = primary;
      if (splitTargets) {
        if (index === 0) {
          usedIds.add(primary.id);
        } else {
          target = TargetingSystem.findNearestTarget(this.x, this.y, this.getRange(), targets, usedIds);
          if (!target) continue;
          usedIds.add(target.id);
        }
      }
      this.fireProjectile(target);
    }
  }

  private fireProjectile(target: Targetable): void {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    const muzzleX = this.x + Math.cos(angle) * 78;
    const muzzleY = this.y + Math.sin(angle) * 78;

    this.projectilePool.fire(
      muzzleX,
      muzzleY,
      target,
      this.getProjectileSpeed(),
      this.getDamageContext(),
    );
  }

  private fireShotgun(target: Targetable, targets: readonly Targetable[]): void {
    const coneAngle = Phaser.Math.DegToRad(
      (this.definition.coneAngleDeg ?? 55) * (this.branchEffect.coneAngleMultiplier ?? 1),
    );
    const pelletCount = Math.max(
      1,
      Math.round((this.definition.pelletCount ?? 12) * (this.branchEffect.pelletCountMultiplier ?? 1)),
    );
    const aimAngle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    const range = this.getRange();

    for (const candidate of targets) {
      if (!candidate.alive) continue;

      const distance = Phaser.Math.Distance.Between(this.x, this.y, candidate.x, candidate.y);
      if (distance > range) continue;

      const candidateAngle = Phaser.Math.Angle.Between(this.x, this.y, candidate.x, candidate.y);
      const angleDelta = Math.abs(Phaser.Math.Angle.Wrap(candidateAngle - aimAngle));
      if (angleDelta > coneAngle / 2) continue;

      const closeness = Phaser.Math.Clamp(1 - distance / range, 0, 1);
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
    graphics.lineTo(this.x + Math.cos(leftAngle) * range, this.y + Math.sin(leftAngle) * range);
    graphics.moveTo(this.x, this.y);
    graphics.lineTo(this.x + Math.cos(rightAngle) * range, this.y + Math.sin(rightAngle) * range);
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
      timerMs: (this.definition.impactDelayMs ?? 800) * (this.branchEffect.impactDelayMultiplier ?? 1),
      burstsRemaining: Math.max(1, Math.round(this.branchEffect.grenadeBursts ?? 1)),
      marker,
    });
  }

  private updatePendingGrenades(deltaMs: number, targets: readonly Targetable[]): void {
    for (let index = this.pendingGrenades.length - 1; index >= 0; index -= 1) {
      const grenade = this.pendingGrenades[index];
      grenade.timerMs -= deltaMs;
      if (grenade.timerMs > 0) continue;

      const radius = (this.definition.aoeRadius ?? 120) * (this.branchEffect.aoeRadiusMultiplier ?? 1);
      const stunMs = Math.max(0, this.branchEffect.stunMsBonus ?? 0);

      for (const target of targets) {
        if (!target.alive) continue;
        if (Phaser.Math.Distance.Between(grenade.x, grenade.y, target.x, target.y) <= radius) {
          DamageSystem.apply(target, this.getDamageContext());
          if (stunMs > 0) target.applyStun(stunMs);
        }
      }

      this.drawExplosion(grenade.x, grenade.y, radius);

      if (grenade.burstsRemaining > 1) {
        grenade.burstsRemaining -= 1;
        grenade.timerMs = 180;
        grenade.x += Phaser.Math.Between(-65, 65);
        grenade.y += Phaser.Math.Between(-45, 45);
        grenade.marker.setPosition(grenade.x, grenade.y);
        continue;
      }

      grenade.marker.destroy();
      this.pendingGrenades.splice(index, 1);
    }
  }

  private drawExplosion(x: number, y: number, radius: number): void {
    const blast = this.scene.add.circle(x, y, radius, this.definition.color, 0.25)
      .setStrokeStyle(5, this.definition.color, 0.8)
      .setDepth(5);
    this.scene.tweens.add({
      targets: blast,
      scale: 1.2,
      alpha: 0,
      duration: 180,
      onComplete: () => blast.destroy(),
    });
  }

  private fireTesla(primary: Targetable, targets: readonly Targetable[]): void {
    const chainCount = Math.max(1, (this.definition.chainCount ?? 3) + (this.branchEffect.chainCountBonus ?? 0));
    const chainRange = (this.definition.chainRange ?? 220) * (this.branchEffect.chainRangeMultiplier ?? 1);
    const stunMs = Math.max(0, (this.definition.stunMs ?? 0) + (this.branchEffect.stunMsBonus ?? 0));
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

  private fireTeslaRadial(targets: readonly Targetable[]): void {
    const range = this.getRange();
    const stunMs = Math.max(0, (this.definition.stunMs ?? 0) + (this.branchEffect.stunMsBonus ?? 0));

    for (const target of targets) {
      if (!target.alive) continue;
      if (Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y) > range) continue;
      DamageSystem.apply(target, this.getDamageContext());
      target.applyStun(stunMs);
    }

    const field = this.scene.add.circle(this.x, this.y, range, this.definition.color, 0.12)
      .setStrokeStyle(6, this.definition.color, 0.8)
      .setDepth(5);
    this.scene.tweens.add({ targets: field, alpha: 0, duration: 140, onComplete: () => field.destroy() });
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
    const reloadSpeedMultiplier = this.branchEffect.reloadSpeedMultiplier ?? 1;
    this.reloadTimerMs = this.definition.reloadTimeMs / reloadSpeedMultiplier;
  }

  private recordFocus(target: Targetable): void {
    if (this.focusTargetId === target.id) {
      this.focusShotCount += 1;
    } else {
      this.focusTargetId = target.id;
      this.focusShotCount = 1;
    }
  }

  private resetFocus(): void {
    this.focusTargetId = null;
    this.focusShotCount = 0;
  }

  private getFocusDamageMultiplier(): number {
    const perShot = this.branchEffect.sameTargetRampPerShot ?? 0;
    const cap = this.branchEffect.sameTargetRampCap ?? 0;
    if (perShot <= 0 || cap <= 0) return 1;
    return 1 + Math.min(cap, Math.max(0, this.focusShotCount - 1) * perShot);
  }
}
