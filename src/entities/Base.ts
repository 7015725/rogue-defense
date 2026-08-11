import * as Phaser from 'phaser';
import { BASE_MAX_HP, BASE_X, BASE_Y } from '../combat/constants';

export class Base {
  readonly x = BASE_X;
  readonly y = BASE_Y;

  private maxHpValue = BASE_MAX_HP;
  private hp = this.maxHpValue;
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

  takeDamage(amount: number): void {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - amount);
    this.scene.tweens.add({ targets: this.body, alpha: 0.45, duration: 55, yoyo: true });
  }

  increaseMaxHp(multiplier: number): void {
    if (multiplier <= 1) return;
    const previousMax = this.maxHpValue;
    this.maxHpValue = Math.round(this.maxHpValue * multiplier);
    this.hp = Math.min(this.maxHpValue, this.hp + (this.maxHpValue - previousMax));
  }
}
