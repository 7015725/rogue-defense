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
import type {
  ArmorGrade,
  EnemyDefinition,
  EnemyKind,
  StatusApplication,
  StatusSnapshot,
  StatusType,
  Targetable,
  TargetDomain,
} from '../combat/types';
import { StatusEffectSystem } from '../systems/StatusEffectSystem';
import { WaveDirector } from '../systems/WaveDirector';
import type { Base } from './Base';

export interface EnemyRewards {
  xp: number;
  credits: number;
}

export interface EnemyDifficultyScale {
  hpMultiplier: number;
  damageMultiplier: number;
}

let nextEnemyId = 1;

const ARMOR_LABELS: Record<ArmorGrade, string> = {
  UNARMORED: '',
  LIGHT: 'LIGHT ARMOR',
  MEDIUM: 'MEDIUM ARMOR',
  HEAVY: 'HEAVY ARMOR',
};

const STATUS_BADGE_REFRESH_MS = 150;
const CROWD_LOD_ENABLE_COUNT = 180;
const CROWD_LOD_DISABLE_COUNT = 140;

export class Enemy implements Targetable {
  private static readonly activeInstances = new Set<Enemy>();
  private static crowdModeEnabled = false;

  readonly id = nextEnemyId++;
  readonly armorGrade: ArmorGrade;
  readonly domain: TargetDomain;

  private readonly baseArmor: number;
  private hp: number;
  private readonly maxHpValue: number;
  private readonly moveSpeed: number;
  private readonly attackDamage: number;
  private readonly attackIntervalMs: number;
  private readonly rewards: EnemyRewards;
  private attackTimerMs = 0;
  private readonly spawnX: number;
  private readonly airPhase: number;
  private readonly shape: Phaser.GameObjects.Rectangle;
  private readonly healthBar: Phaser.GameObjects.Rectangle;
  private readonly armorBadge: Phaser.GameObjects.Text | null;
  private readonly domainBadge: Phaser.GameObjects.Text | null;
  private statusBadge: Phaser.GameObjects.Text | null = null;
  private lastStatusLabel = '';
  private statusBadgeRefreshMs = 0;
  private readonly statusEffects: StatusEffectSystem;
  private dead = false;
  private crowdMode = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly base: Base,
    readonly kind: EnemyKind,
    laneIndex: number,
    private readonly onKilled: (enemy: Enemy, rewards: EnemyRewards) => void,
    difficultyScale: EnemyDifficultyScale = { hpMultiplier: 1, damageMultiplier: 1 },
  ) {
    const stats = this.getDefinition(kind);
    const spawnWave = WaveDirector.getActiveSpawnWave();
    const waveScale = WaveDirector.getActiveSpawnScaling();
    const rewardMultiplier = WaveDirector.getRewardMultiplier(spawnWave);
    const hpMultiplier = Math.max(0.01, difficultyScale.hpMultiplier) * waveScale.hpMultiplier;
    const damageMultiplier = Math.max(0.01, difficultyScale.damageMultiplier) * waveScale.damageMultiplier;

    this.maxHpValue = Math.max(1, Math.round(stats.hp * hpMultiplier));
    this.hp = this.maxHpValue;
    this.baseArmor = stats.armor;
    this.armorGrade = stats.armorGrade;
    this.domain = stats.domain;
    this.moveSpeed = stats.moveSpeed;
    this.attackDamage = stats.attackDamage * damageMultiplier;
    this.attackIntervalMs = stats.attackIntervalMs;
    this.rewards = {
      xp: Math.max(1, Math.round(stats.xp * rewardMultiplier)),
      credits: Math.max(1, Math.round(stats.credits * rewardMultiplier)),
    };
    this.statusEffects = new StatusEffectSystem(kind === 'boss', (amount) => this.takeDamage(amount));

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

    Enemy.activeInstances.add(this);
    if (Enemy.crowdModeEnabled) this.setCrowdMode(true);
    Enemy.refreshCrowdMode();
  }

  get x(): number { return this.shape.x; }
  get y(): number { return this.shape.y; }
  get alive(): boolean { return !this.dead; }
  get armor(): number { return Math.max(0, this.baseArmor - this.statusEffects.armorBreakAmount); }
  get currentHp(): number { return this.hp; }
  get maxHp(): number { return this.maxHpValue; }
  get hardControlled(): boolean { return this.statusEffects.hardControlled; }

  get pathProgress(): number {
    return Phaser.Math.Clamp((this.y - ENEMY_SPAWN_Y) / (BASE_ATTACK_Y - ENEMY_SPAWN_Y), 0, 1);
  }

  setCrowdMode(enabled: boolean): void {
    const next = enabled && this.kind !== 'boss';
    if (this.crowdMode === next) return;
    this.crowdMode = next;
    this.healthBar.setVisible(!next);
    this.armorBadge?.setVisible(!next);
    this.domainBadge?.setVisible(!next);
    if (next) {
      this.statusBadge?.setVisible(false);
    } else {
      this.syncDecorations();
      this.updateHealthBar();
      this.updateStatusBadge(true);
    }
  }

  update(deltaMs: number): void {
    if (this.dead) return;

    this.statusEffects.update(deltaMs);
    if (this.dead) return;

    if (!this.crowdMode) {
      this.statusBadgeRefreshMs += deltaMs;
      if (this.statusBadgeRefreshMs >= STATUS_BADGE_REFRESH_MS) {
        this.statusBadgeRefreshMs %= STATUS_BADGE_REFRESH_MS;
        this.updateStatusBadge();
      }
    }

    if (this.statusEffects.movementBlocked) return;

    if (this.y < BASE_ATTACK_Y) {
      const effectiveMoveSpeed = this.moveSpeed * this.statusEffects.moveSpeedMultiplier;
      const nextProgress = Phaser.Math.Clamp(
        (this.y + effectiveMoveSpeed * (deltaMs / 1000) - ENEMY_SPAWN_Y) / (BASE_ATTACK_Y - ENEMY_SPAWN_Y),
        0,
        1,
      );
      this.shape.y = ENEMY_SPAWN_Y + (BASE_ATTACK_Y - ENEMY_SPAWN_Y) * nextProgress;
      this.shape.x = this.domain === 'AIR'
        ? this.getAirPathX(nextProgress)
        : Phaser.Math.Linear(this.spawnX, BASE_X, Math.pow(nextProgress, 1.35));
      if (!this.crowdMode) this.syncDecorations();
      return;
    }

    this.attackTimerMs += deltaMs;
    const effectiveAttackInterval = this.attackIntervalMs / this.statusEffects.attackSpeedMultiplier;
    while (this.attackTimerMs >= effectiveAttackInterval && this.base.alive) {
      this.attackTimerMs -= effectiveAttackInterval;
      this.base.takeDamage(this.attackDamage);
    }
  }

  takeDamage(amount: number): void {
    if (this.dead) return;
    this.hp = Math.max(0, this.hp - amount);
    if (!this.crowdMode) this.updateHealthBar();

    if (this.hp <= 0) {
      this.dead = true;
      this.destroyVisuals();
      this.onKilled(this, this.rewards);
    }
  }

  applyStatus(application: StatusApplication): void {
    if (this.dead) return;
    this.statusEffects.apply(application);
    if (!this.crowdMode) this.updateStatusBadge(true);
  }

  hasStatus(type: StatusType): boolean {
    return this.statusEffects.has(type);
  }

  getStatus(type: StatusType): StatusSnapshot | null {
    return this.statusEffects.get(type);
  }

  consumeStatusStacks(type: StatusType, count: number): number {
    const consumed = this.statusEffects.consumeStacks(type, count);
    if (!this.crowdMode) this.updateStatusBadge(true);
    return consumed;
  }

  destroy(): void {
    if (!this.shape.scene) {
      Enemy.unregister(this);
      return;
    }
    this.dead = true;
    this.destroyVisuals();
  }

  private static refreshCrowdMode(): void {
    const count = Enemy.activeInstances.size;
    const next = Enemy.crowdModeEnabled
      ? count > CROWD_LOD_DISABLE_COUNT
      : count >= CROWD_LOD_ENABLE_COUNT;
    if (next === Enemy.crowdModeEnabled) return;
    Enemy.crowdModeEnabled = next;
    for (const enemy of Enemy.activeInstances) enemy.setCrowdMode(next);
  }

  private static unregister(enemy: Enemy): void {
    if (!Enemy.activeInstances.delete(enemy)) return;
    Enemy.refreshCrowdMode();
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

  private updateStatusBadge(force = false): void {
    if (this.dead || this.crowdMode) return;
    const label = this.statusEffects.label;
    if (!force && label === this.lastStatusLabel) return;
    this.lastStatusLabel = label;

    if (label.length === 0) {
      this.statusBadge?.setVisible(false);
      return;
    }

    if (!this.statusBadge) {
      this.statusBadge = this.scene.add.text(this.x, this.y - this.shape.height * 1.05, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#fef3c7',
        backgroundColor: '#020617bb',
        padding: { x: 3, y: 1 },
      }).setOrigin(0.5);
    }

    this.statusBadge.setText(label).setVisible(true);
  }

  private syncDecorations(): void {
    this.healthBar.setPosition(this.shape.x, this.shape.y - this.shape.height * 0.72);
    this.armorBadge?.setPosition(this.shape.x, this.shape.y + this.shape.height * 0.72);
    this.domainBadge?.setPosition(this.shape.x, this.shape.y + this.shape.height * 0.85);
    this.statusBadge?.setPosition(this.shape.x, this.shape.y - this.shape.height * 1.05);
  }

  private destroyVisuals(): void {
    Enemy.unregister(this);
    this.shape.destroy();
    this.healthBar.destroy();
    this.armorBadge?.destroy();
    this.domainBadge?.destroy();
    this.statusBadge?.destroy();
    this.statusBadge = null;
  }
}
