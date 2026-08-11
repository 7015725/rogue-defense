import * as Phaser from 'phaser';
import {
  BASE_ATTACK_Y,
  BASE_X,
  BOSS,
  ENEMY_SPAWN_Y,
  INFANTRY,
  LANE_OFFSETS,
} from '../combat/constants';
import type { Targetable } from '../combat/types';
import type { Base } from './Base';

export type EnemyKind = 'infantry' | 'boss';

let nextEnemyId = 1;

export class Enemy implements Targetable {
  readonly id = nextEnemyId++;
  readonly armor: number;

  private hp: number;
  private readonly maxHp: number;
  private readonly moveSpeed: number;
  private readonly attackDamage: number;
  private readonly attackIntervalMs: number;
  private attackTimerMs = 0;
  private readonly spawnX: number;
  private readonly shape: Phaser.GameObjects.Rectangle;
  private readonly healthBar: Phaser.GameObjects.Rectangle;
  private dead = false;

  constructor(
    scene: Phaser.Scene,
    private readonly base: Base,
    readonly kind: EnemyKind,
    laneIndex: number,
  ) {
    const stats = kind === 'boss' ? BOSS : INFANTRY;
    this.maxHp = stats.hp;
    this.hp = stats.hp;
    this.armor = stats.armor;
    this.moveSpeed = stats.moveSpeed;
    this.attackDamage = stats.attackDamage;
    this.attackIntervalMs = stats.attackIntervalMs;

    this.spawnX = BASE_X + LANE_OFFSETS[laneIndex % LANE_OFFSETS.length];
    const size = kind === 'boss' ? 92 : 42;
    const fill = kind === 'boss' ? 0xb45309 : 0x64748b;

    this.shape = scene.add.rectangle(this.spawnX, ENEMY_SPAWN_Y, size, size, fill).setStrokeStyle(4, 0xe2e8f0);
    this.healthBar = scene.add.rectangle(this.spawnX, ENEMY_SPAWN_Y - size * 0.72, size, 8, 0x22c55e).setOrigin(0.5, 0.5);
  }

  get x(): number { return this.shape.x; }
  get y(): number { return this.shape.y; }
  get alive(): boolean { return !this.dead; }

  get pathProgress(): number {
    return Phaser.Math.Clamp((this.y - ENEMY_SPAWN_Y) / (BASE_ATTACK_Y - ENEMY_SPAWN_Y), 0, 1);
  }

  update(deltaMs: number): void {
    if (this.dead) return;

    if (this.y < BASE_ATTACK_Y) {
      const nextProgress = Phaser.Math.Clamp(
        (this.y + this.moveSpeed * (deltaMs / 1000) - ENEMY_SPAWN_Y) / (BASE_ATTACK_Y - ENEMY_SPAWN_Y),
        0,
        1,
      );
      this.shape.y = ENEMY_SPAWN_Y + (BASE_ATTACK_Y - ENEMY_SPAWN_Y) * nextProgress;
      this.shape.x = Phaser.Math.Linear(this.spawnX, BASE_X, Math.pow(nextProgress, 1.35));
      this.syncHealthBar();
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
      this.shape.destroy();
      this.healthBar.destroy();
    }
  }

  destroy(): void {
    if (!this.shape.scene) return;
    this.dead = true;
    this.shape.destroy();
    this.healthBar.destroy();
  }

  private updateHealthBar(): void {
    const ratio = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    this.healthBar.scaleX = ratio;
  }

  private syncHealthBar(): void {
    this.healthBar.setPosition(this.shape.x, this.shape.y - this.shape.height * 0.72);
  }
}
