import * as Phaser from 'phaser';
import { BASE_MAX_HP, BASE_X, BASE_Y } from '../combat/constants';

export class Base {
  readonly x = BASE_X;
  readonly y = BASE_Y;
  readonly maxHp = BASE_MAX_HP;

  private hp = this.maxHp;
  private readonly body: Phaser.GameObjects.Rectangle;

  constructor(private readonly scene: Phaser.Scene) {
    this.body = scene.add.rectangle(this.x, this.y, 280, 130, 0x334155).setStrokeStyle(6, 0x94a3b8);
    scene.add.rectangle(this.x, this.y - 66, 180, 22, 0x1e293b).setStrokeStyle(3, 0x64748b);
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
}
