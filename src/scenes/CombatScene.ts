import * as Phaser from 'phaser';
import {
  BASE_ATTACK_Y,
  BATTLEFIELD_HEIGHT,
  BATTLEFIELD_WIDTH,
  ENEMY_SPAWN_Y,
} from '../combat/constants';
import { Base } from '../entities/Base';
import { Enemy } from '../entities/Enemy';
import { Weapon } from '../entities/Weapon';
import { ProjectilePool } from '../systems/ProjectilePool';
import { WaveManager } from '../systems/WaveManager';

export class CombatScene extends Phaser.Scene {
  private base!: Base;
  private weapon!: Weapon;
  private projectilePool!: ProjectilePool;
  private waveManager!: WaveManager;
  private enemies: Enemy[] = [];
  private gameSpeed = 1;
  private finished = false;

  private waveText!: Phaser.GameObjects.Text;
  private enemyText!: Phaser.GameObjects.Text;
  private baseText!: Phaser.GameObjects.Text;
  private weaponText!: Phaser.GameObjects.Text;
  private debugText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super('CombatScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x0f172a);
    this.drawBattlefield();

    this.base = new Base(this);
    this.projectilePool = new ProjectilePool(this, 256);
    this.weapon = new Weapon(this, this.projectilePool);
    this.waveManager = new WaveManager();

    this.createUi();
    this.bindControls();
  }

  update(_time: number, delta: number): void {
    if (this.finished) return;

    const simDelta = Math.min(delta, 50) * this.gameSpeed;
    const bossAlive = this.enemies.some((enemy) => enemy.alive && enemy.kind === 'boss');

    for (const request of this.waveManager.update(simDelta, bossAlive)) {
      this.enemies.push(new Enemy(this, this.base, request.kind, request.laneIndex));
    }

    for (const enemy of this.enemies) enemy.update(simDelta);
    this.weapon.update(simDelta, this.enemies);
    this.projectilePool.update(simDelta);

    this.enemies = this.enemies.filter((enemy) => enemy.alive);

    if (!this.base.alive) {
      this.finished = true;
      this.showFinish('BASE DESTROYED\nPress R to restart');
    } else if (this.waveManager.isComplete) {
      this.clearRemainingEnemies();
      this.finished = true;
      this.showFinish('M0.1 TEST COMPLETE\nWave 10 Boss defeated\nPress R to restart');
    }

    this.updateUi();
  }

  private drawBattlefield(): void {
    this.add.rectangle(BATTLEFIELD_WIDTH / 2, BATTLEFIELD_HEIGHT / 2, BATTLEFIELD_WIDTH - 36, BATTLEFIELD_HEIGHT - 36, 0x111827)
      .setStrokeStyle(4, 0x334155);

    this.add.rectangle(BATTLEFIELD_WIDTH / 2, ENEMY_SPAWN_Y, BATTLEFIELD_WIDTH - 80, 76, 0x172554, 0.65);
    this.add.text(44, 36, 'ENEMY SPAWN', { fontSize: '24px', color: '#93c5fd' });

    this.add.rectangle(BATTLEFIELD_WIDTH / 2, BASE_ATTACK_Y, BATTLEFIELD_WIDTH - 80, 4, 0xef4444, 0.55);
    this.add.text(44, BASE_ATTACK_Y - 38, 'BASE ATTACK LINE', { fontSize: '20px', color: '#fca5a5' });

    for (const offset of [-160, -80, 0, 80, 160]) {
      this.add.line(0, 0, BATTLEFIELD_WIDTH / 2 + offset, ENEMY_SPAWN_Y + 60, BATTLEFIELD_WIDTH / 2, BASE_ATTACK_Y, 0x334155, 0.28)
        .setOrigin(0, 0);
    }
  }

  private createUi(): void {
    const style = { fontFamily: 'monospace', fontSize: '28px', color: '#f8fafc' };
    this.waveText = this.add.text(36, 138, '', style).setDepth(10);
    this.enemyText = this.add.text(36, 178, '', style).setDepth(10);
    this.baseText = this.add.text(36, BATTLEFIELD_HEIGHT - 102, '', style).setDepth(10);
    this.weaponText = this.add.text(36, BATTLEFIELD_HEIGHT - 62, '', style).setDepth(10);
    this.debugText = this.add.text(BATTLEFIELD_WIDTH - 36, 36, '', { ...style, fontSize: '22px', align: 'right' }).setOrigin(1, 0).setDepth(10);
    this.statusText = this.add.text(BATTLEFIELD_WIDTH / 2, BATTLEFIELD_HEIGHT / 2, '', {
      ...style,
      fontSize: '44px',
      align: 'center',
      backgroundColor: '#020617cc',
      padding: { x: 28, y: 22 },
    }).setOrigin(0.5).setDepth(20).setVisible(false);
  }

  private updateUi(): void {
    this.waveText.setText(`Wave ${this.waveManager.wave}${this.waveManager.isBossWave ? '  BOSS' : ''}`);
    this.enemyText.setText(`Enemies ${this.enemies.length}`);
    this.baseText.setText(`Base HP ${Math.ceil(this.base.currentHp)} / ${this.base.maxHp}`);
    this.weaponText.setText(`Auto Cannon  Ammo ${this.weapon.currentAmmo}/12  ${this.weapon.currentState}`);
    this.debugText.setText([
      `Speed ${this.gameSpeed}x`,
      `Projectiles ${this.projectilePool.activeCount}`,
      `FPS ${Math.round(this.game.loop.actualFps)}`,
      'Keys: 1-4 speed · R restart',
    ]);
  }

  private bindControls(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;

    keyboard.on('keydown-ONE', () => { this.gameSpeed = 1; });
    keyboard.on('keydown-TWO', () => { this.gameSpeed = 2; });
    keyboard.on('keydown-THREE', () => { this.gameSpeed = 3; });
    keyboard.on('keydown-FOUR', () => { this.gameSpeed = 4; });
    keyboard.on('keydown-R', () => this.scene.restart());
  }

  private clearRemainingEnemies(): void {
    for (const enemy of this.enemies) enemy.destroy();
    this.enemies = [];
  }

  private showFinish(message: string): void {
    this.statusText.setText(message).setVisible(true);
  }
}
