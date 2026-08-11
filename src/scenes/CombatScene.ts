import * as Phaser from 'phaser';
import {
  AUTO_CANNON,
  BASE_ATTACK_Y,
  BATTLEFIELD_HEIGHT,
  BATTLEFIELD_WIDTH,
  ENEMY_SPAWN_Y,
  RANDOM_WEAPON_DEFINITIONS,
  RANDOM_WEAPON_SLOT_POSITIONS,
  TURRET_Y,
  type RandomWeaponId,
} from '../combat/constants';
import { Base } from '../entities/Base';
import { Enemy, type EnemyRewards } from '../entities/Enemy';
import { Weapon } from '../entities/Weapon';
import { RunState } from '../run/RunState';
import { ProjectilePool } from '../systems/ProjectilePool';
import { WaveManager } from '../systems/WaveManager';
import { UpgradeOverlay } from '../ui/UpgradeOverlay';
import {
  UpgradeDirectorLite,
  type UpgradeOption,
} from '../upgrades/UpgradeDirectorLite';

export class CombatScene extends Phaser.Scene {
  private base!: Base;
  private projectilePool!: ProjectilePool;
  private waveManager!: WaveManager;
  private runState!: RunState;
  private upgradeDirector!: UpgradeDirectorLite;
  private upgradeOverlay!: UpgradeOverlay;
  private autoCannon!: Weapon;
  private readonly randomWeapons = new Map<RandomWeaponId, Weapon>();
  private weapons: Weapon[] = [];
  private enemies: Enemy[] = [];
  private gameSpeed = 1;
  private finished = false;

  private globalDamageMultiplier = 1;
  private globalAttackSpeedMultiplier = 1;
  private globalDamageLevel = 0;
  private globalAttackSpeedLevel = 0;
  private baseHpUpgradeLevel = 0;

  private waveText!: Phaser.GameObjects.Text;
  private enemyText!: Phaser.GameObjects.Text;
  private runText!: Phaser.GameObjects.Text;
  private creditsText!: Phaser.GameObjects.Text;
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
    this.waveManager = new WaveManager();
    this.runState = new RunState();
    this.upgradeDirector = new UpgradeDirectorLite();
    this.upgradeOverlay = new UpgradeOverlay(this, (option) => this.handleUpgradeSelection(option));

    this.autoCannon = new Weapon(
      this,
      this.projectilePool,
      AUTO_CANNON,
      BATTLEFIELD_WIDTH / 2,
      TURRET_Y,
    );
    this.weapons = [this.autoCannon];
    this.refreshWeaponModifiers();

    this.createUi();
    this.bindControls();
    this.updateUi();
  }

  update(_time: number, delta: number): void {
    if (this.finished) return;

    if (this.upgradeOverlay.visible) {
      this.updateUi();
      return;
    }

    const simDelta = Math.min(delta, 50) * this.gameSpeed;
    const bossAlive = this.enemies.some((enemy) => enemy.alive && enemy.kind === 'boss');

    for (const request of this.waveManager.update(simDelta, bossAlive)) {
      this.enemies.push(new Enemy(
        this,
        this.base,
        request.kind,
        request.laneIndex,
        (enemy, rewards) => this.handleEnemyKilled(enemy, rewards),
      ));
    }

    for (const enemy of this.enemies) enemy.update(simDelta);
    for (const weapon of this.weapons) weapon.update(simDelta, this.enemies);
    this.projectilePool.update(simDelta);

    this.enemies = this.enemies.filter((enemy) => enemy.alive);

    if (!this.base.alive) {
      this.finished = true;
      this.showFinish('BASE DESTROYED\nPress R to restart');
    } else if (this.waveManager.isComplete) {
      this.clearRemainingEnemies();
      this.finished = true;
      this.showFinish('M0.3 TEST COMPLETE\nFive-weapon pool active\nPress R to restart');
    } else if (this.runState.pendingUpgrades > 0) {
      this.openUpgradeChoice();
    }

    this.updateUi();
  }

  private handleEnemyKilled(_enemy: Enemy, rewards: EnemyRewards): void {
    this.runState.addRewards(rewards.xp, rewards.credits);
  }

  private openUpgradeChoice(): void {
    const options = this.upgradeDirector.generate({
      runLevel: this.runState.level,
      ownedWeaponIds: [...this.randomWeapons.keys()],
      autoCannonLevel: this.autoCannon.level,
      globalDamageLevel: this.globalDamageLevel,
      globalAttackSpeedLevel: this.globalAttackSpeedLevel,
      baseHpUpgradeLevel: this.baseHpUpgradeLevel,
    });

    this.upgradeOverlay.show(options, this.runState.getSkipReward());
  }

  private handleUpgradeSelection(option: UpgradeOption | null): void {
    if (option === null) {
      this.runState.addCredits(this.runState.getSkipReward());
    } else {
      this.applyUpgrade(option);
    }

    this.runState.consumePendingUpgrade();

    if (this.runState.pendingUpgrades > 0 && !this.finished) {
      this.openUpgradeChoice();
    }

    this.updateUi();
  }

  private applyUpgrade(option: UpgradeOption): void {
    if (option.weaponId) {
      this.unlockRandomWeapon(option.weaponId);
      return;
    }

    switch (option.id) {
      case 'global-damage':
        this.globalDamageLevel += 1;
        this.globalDamageMultiplier *= 1.10;
        this.refreshWeaponModifiers();
        break;
      case 'global-attack-speed':
        this.globalAttackSpeedLevel += 1;
        this.globalAttackSpeedMultiplier *= 1.08;
        this.refreshWeaponModifiers();
        break;
      case 'base-max-hp':
        this.baseHpUpgradeLevel += 1;
        this.base.increaseMaxHp(1.12);
        break;
      case 'auto-cannon-level':
        this.autoCannon.upgradeLevel();
        break;
    }
  }

  private unlockRandomWeapon(weaponId: RandomWeaponId): void {
    if (this.randomWeapons.has(weaponId) || this.randomWeapons.size >= RANDOM_WEAPON_SLOT_POSITIONS.length) return;

    const position = RANDOM_WEAPON_SLOT_POSITIONS[this.randomWeapons.size];
    const weapon = new Weapon(
      this,
      this.projectilePool,
      RANDOM_WEAPON_DEFINITIONS[weaponId],
      position.x,
      position.y,
    );

    this.randomWeapons.set(weaponId, weapon);
    this.weapons.push(weapon);
    this.refreshWeaponModifiers();
  }

  private refreshWeaponModifiers(): void {
    for (const weapon of this.weapons) {
      weapon.setGlobalModifiers(this.globalDamageMultiplier, this.globalAttackSpeedMultiplier);
    }
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
    this.runText = this.add.text(36, 218, '', style).setDepth(10);
    this.creditsText = this.add.text(36, 258, '', style).setDepth(10);
    this.baseText = this.add.text(36, BATTLEFIELD_HEIGHT - 265, '', { ...style, fontSize: '21px' }).setDepth(10);
    this.weaponText = this.add.text(36, BATTLEFIELD_HEIGHT - 225, '', { ...style, fontSize: '17px' }).setDepth(10);
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
    this.runText.setText(`Run Lv ${this.runState.level}  EXP ${this.runState.xp}/${this.runState.xpToNextLevel}`);
    this.creditsText.setText(`Credits ${this.runState.credits}`);
    this.baseText.setText(`Base HP ${Math.ceil(this.base.currentHp)} / ${this.base.maxHp}`);

    const weaponLines = this.weapons.map((weapon, index) => (
      `S${index + 1} ${weapon.name} Lv${weapon.level}  Ammo ${weapon.ammoLabel}  ${weapon.currentState}`
    ));
    this.weaponText.setText(weaponLines);

    this.debugText.setText([
      `Speed ${this.gameSpeed}x${this.upgradeOverlay.visible ? ' · PAUSED' : ''}`,
      `Weapons ${this.weapons.length}/5`,
      `Projectiles ${this.projectilePool.activeCount}`,
      `FPS ${Math.round(this.game.loop.actualFps)}`,
      `DMG ${this.globalDamageMultiplier.toFixed(2)}x · AS ${this.globalAttackSpeedMultiplier.toFixed(2)}x`,
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
