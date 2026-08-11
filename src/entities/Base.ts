import * as Phaser from 'phaser';
import { BASE_MAX_HP, BASE_X, BASE_Y } from '../combat/constants';

export class Base {
  readonly x = BASE_X;
  readonly y = BASE_Y;

  private maxHpValue = BASE_MAX_HP;
  private hp = this.maxHpValue;
  private damageReductionValue = 0;
  private readonly body: Phaser.GameObjects.Rectangle;

  constructor(private readonly scene: Phaser.Scene) {
    this.body = scene.add.rectangle(this.x, this.y, 280, 130, 0x334155).setStrokeStyle(6, 0x94a3b8);
    scene.add.rectangle(this.x, this.y - 66, 180, 22, 0x1e293b).setStrokeStyle(3, 0x64748b);
  }

  get maxHp(): number {
    return this.maxHpValue;
  }

  get currentHp(): number {
    return this.hp;
  }

  get alive(): boolean {
    return this.hp > 0;
  }

  get missingHp(): number {
    return Math.max(0, this.maxHpValue - this.hp);
  }

  get damageReduction(): number {
    return this.damageReductionValue;
  }

  takeDamage(amount: number): void {
    if (!this.alive) return;
    const finalDamage = Math.max(0, amount) * (1 - this.damageReductionValue);
    this.hp = Math.max(0, this.hp - finalDamage);
    this.scene.tweens.add({ targets: this.body, alpha: 0.45, duration: 55, yoyo: true });
  }

  heal(amount: number): number {
    if (!this.alive || amount <= 0) return 0;
    const before = this.hp;
    this.hp = Math.min(this.maxHpValue, this.hp + amount);
    return this.hp - before;
  }

  healFraction(fraction: number): number {
    return this.heal(this.maxHpValue * Math.max(0, fraction));
  }

  increaseMaxHp(multiplier: number): void {
    if (multiplier <= 1) return;
    const previousMax = this.maxHpValue;
    this.maxHpValue = Math.round(this.maxHpValue * multiplier);
    this.hp = Math.min(this.maxHpValue, this.hp + (this.maxHpValue - previousMax));
  }

  addDamageReduction(amount: number): void {
    if (amount <= 0) return;
    this.damageReductionValue = Math.min(0.40, this.damageReductionValue + amount);
  }
}
