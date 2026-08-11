import * as Phaser from 'phaser';
import {
  AIR_LANE_OFFSETS,
  BASE_ATTACK_Y,
  BASE_X,
  BOSS,
  ENEMY_SPAWN_Y,
  FLYING,
  HEAVY,
  INFANTRY,
  LANE_OFFSETS,
} from '../combat/constants';
import type { ArmorGrade, EnemyDefinition, EnemyKind, Targetable, TargetDomain } from '../combat/types';
import type { Base } from './Base';

export interface EnemyRewards {
  xp: number;
  credits: number;
}

let nextEnemyId = 1;

const ARMOR_LABELS: Record<ArmorGrade, string> = {
  UNARMORED: '',
  LIGHT: 'LIGHT ARMOR',
  MEDIUM: 'MEDIUM ARMOR',
  HEAVY: 'HEAVY ARMOR',
};

export class Enemy implements Targetable {
  readonly id = nextEnemyId++;
  readonly armorGrade: ArmorGrade;
  readonly domain: TargetDomain;

  private readonly baseArmor: number;
  private armorBreakAmount = 0;
  private armorBreakTimerMs = 0;
  private hp: number;
  private readonly maxHpValue: number;
  private readonly moveSpeed: number;
  private readonly attackDamage: number;
  private readonly attackIntervalMs: number;
  private readonly rewards: EnemyRewards;
  private attackTimerMs = 0;
  private stunTimerMs = 0;
  private readonly spawnX: number;
  private readonly airPhase: number;
  private readonly shape: Phaser.GameObjects.Rectangle;
  private readonly healthBar: Phaser.GameObjects.Rectangle;
  private readonly armorBadge: Phaser.GameObjects.Text | null;
  private readonly domainBadge: Phaser.GameObjects.Text | null;
  private dead = false;

  constructor(
    scene: Phaser.Scene,
    private readonly base: Base,
    readonly kind: EnemyKind,
    laneIndex: number,
    private readonly onKilled: (enemy: Enemy, rewards: EnemyRewards) => void,
  ) {
    const stats = this.getDefinition(kind);
    this.maxHpValue = stats.hp;
    this.hp = stats.hp;
    this.baseArmor = stats.armor;
    this.armorGrade = stats.armorGrade;
    this.domain = stats.domain;
    this.moveSpeed = stats.moveSpeed;
    this.attackDamage = stats.attackDamage;
    this.attackIntervalMs = stats.attackIntervalMs;
    this.rewards = { xp: stats.xp, credits: stats.credits };

    const laneOffsets = this.domain === 'AIR' ? AIR_LANE_OFFSETS : LANE_OFFSETS;
    this.spawnX = BASE_X + laneOffsets[laneIndex % laneOffsets.length];
    this.airPhase = (laneIndex % laneOffsets.length) * 0.9;

    this.shape = scene.add.rectangle(this.spawnX, ENEMY_SPAWN_Y, stats.size, stats.size, stats.color)
      .setStrokeStyle(kind === 'heavy' ? 6 : 4, this.domain === 'AIR' ? 0xbae6fd : 0xe2e8f0);
    if (this.domain === 'AIR') this.shape.setRotation(Math.PI / 4);

    this.healthBar = scene.add.rectangle(
      this.spawnX,
      ENEMY_SPAWN_Y - stats.size * 0.72,
      stats.size,
      8,
      0x22c55e,
    ).setOrigin(0.5, 0.5);

    const armorLabel = ARMOR_LABELS[this.armorGrade];
    this.armorBadge = armorLabel
      ? scene.add.text(this.spawnX, ENEMY_SPAWN_Y + stats.size * 0.72, armorLabel, {
        fontFamily: 'monospace',
        fontSize: kind === 'boss' ? '16px' : '12px',
        color: this.armorGrade === 'HEAVY' ? '#f8fafc' : '#fde68a',
        backgroundColor: '#020617bb',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5)
      : null;

    this.domainBadge = this.domain === 'AIR'
      ? scene.add.text(this.spawnX, ENEMY_SPAWN_Y + stats.size * 0.85, 'AIR', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#7dd3fc',
        backgroundColor: '#082f49cc',
        padding: { x: 5, y: 2 },
      }).setOrigin(0.5)
      : null;
  }

  get x(): number { return this.shape.x; }
  get y(): number { return this.shape.y; }
  get alive(): boolean { return !this.dead; }
  get armor(): number { return Math.max(0, this.baseArmor - this.armorBreakAmount); }
  get currentHp(): number { return this.hp; }
  get maxHp(): number { return this.maxHpValue; }

  get pathProgress(): number {
    return Phaser.Math.Clamp((this.y - ENEMY_SPAWN_Y) / (BASE_ATTACK_Y - ENEMY_SPAWN_Y), 0, 1);
  }

  update(deltaMs: number): void {
    if (this.dead) return;

    if (this.armorBreakTimerMs > 0) {
      this.armorBreakTimerMs = Math.max(0, this.armorBreakTimerMs - deltaMs);
      if (this.armorBreakTimerMs === 0) this.armorBreakAmount = 0;
    }

    if (this.stunTimerMs > 0) {
      this.stunTimerMs = Math.max(0, this.stunTimerMs - deltaMs);
      return;
    }

    if (this.y < BASE_ATTACK_Y) {
      const nextProgress = Phaser.Math.Clamp(
        (this.y + this.moveSpeed * (deltaMs / 1000) - ENEMY_SPAWN_Y) / (BASE_ATTACK_Y - ENEMY_SPAWN_Y),
        0,
        1,
      );
      this.shape.y = ENEMY_SPAWN_Y + (BASE_ATTACK_Y - ENEMY_SPAWN_Y) * nextProgress;
      this.shape.x = this.domain === 'AIR'
        ? this.getAirPathX(nextProgress)
        : Phaser.Math.Linear(this.spawnX, BASE_X, Math.pow(nextProgress, 1.35));
      this.syncDecorations();
      return;
    }

    this.attackTimerMs += deltaMs;
    while (this.attackTimerMs >= this.attackIntervalMs && this.base.alive) {
      this.attackTimerMs -= this.attackIntervalMs;
      this.base.takeDamage(this.attackDamage);
    }
  }

  takeDamage(amount: number): void {
    if (this.dead) return;
    this.hp = Math.max(0, this.hp - amount);
    this.updateHealthBar();

    if (this.hp <= 0) {
      this.dead = true;
      this.destroyVisuals();
      this.onKilled(this, this.rewards);
    }
  }

  applyStun(durationMs: number): void {
    if (this.dead) return;
    this.stunTimerMs = Math.max(this.stunTimerMs, Math.max(0, durationMs));
  }

  applyArmorBreak(amount: number, durationMs: number): void {
    if (this.dead) return;
    this.armorBreakAmount = Math.max(this.armorBreakAmount, Math.max(0, amount));
    this.armorBreakTimerMs = Math.max(this.armorBreakTimerMs, Math.max(0, durationMs));
  }

  destroy(): void {
    if (!this.shape.scene) return;
    this.dead = true;
    this.destroyVisuals();
  }

  private getDefinition(kind: EnemyKind): EnemyDefinition {
    switch (kind) {
      case 'heavy': return HEAVY;
      case 'flying': return FLYING;
      case 'boss': return BOSS;
      case 'infantry':
      default: return INFANTRY;
    }
  }

  private getAirPathX(progress: number): number {
    const centerPull = Phaser.Math.Linear(this.spawnX, BASE_X, Math.pow(progress, 1.05));
    const sway = Math.sin(progress * Math.PI * 3 + this.airPhase) * 95 * (1 - progress * 0.7);
    return centerPull + sway;
  }

  private updateHealthBar(): void {
    const ratio = Phaser.Math.Clamp(this.hp / this.maxHpValue, 0, 1);
    this.healthBar.scaleX = ratio;
  }

  private syncDecorations(): void {
    this.healthBar.setPosition(this.shape.x, this.shape.y - this.shape.height * 0.72);
    this.armorBadge?.setPosition(this.shape.x, this.shape.y + this.shape.height * 0.72);
    this.domainBadge?.setPosition(this.shape.x, this.shape.y + this.shape.height * 0.85);
  }

  private destroyVisuals(): void {
    this.shape.destroy();
    this.healthBar.destroy();
    this.armorBadge?.destroy();
    this.domainBadge?.destroy();
  }
}
