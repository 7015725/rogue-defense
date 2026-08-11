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
import type { ComboId } from '../combat/types';
import { Base } from '../entities/Base';
import { Enemy, type EnemyRewards } from '../entities/Enemy';
import { Weapon } from '../entities/Weapon';
import { RunState } from '../run/RunState';
import {
  BossShopDirector,
  type BossShopItem,
} from '../shop/BossShopDirector';
import { ProjectilePool } from '../systems/ProjectilePool';
import { WaveManager } from '../systems/WaveManager';
import { BossShopOverlay } from '../ui/BossShopOverlay';
import { UpgradeOverlay } from '../ui/UpgradeOverlay';
import { WeaponBranchOverlay } from '../ui/WeaponBranchOverlay';
import { WeaponReplacementOverlay } from '../ui/WeaponReplacementOverlay';
import {
  UpgradeDirectorLite,
  type UpgradeOption,
} from '../upgrades/UpgradeDirectorLite';
import type { WeaponBranchChoice, WeaponBranchStage } from '../weapons/WeaponProgression';

export class CombatScene extends Phaser.Scene {
  private base!: Base;
  private projectilePool!: ProjectilePool;
  private waveManager!: WaveManager;
  private runState!: RunState;
  private upgradeDirector!: UpgradeDirectorLite;
  private shopDirector!: BossShopDirector;
  private upgradeOverlay!: UpgradeOverlay;
  private branchOverlay!: WeaponBranchOverlay;
  private bossShopOverlay!: BossShopOverlay;
  private replacementOverlay!: WeaponReplacementOverlay;
  private readonly randomWeapons = new Map<RandomWeaponId, Weapon>();
  private readonly activeCombos = new Set<ComboId>();
  private weapons: Weapon[] = [];
  private enemies: Enemy[] = [];
  private gameSpeed = 1;
  private finished = false;

  private globalDamageMultiplier = 1;
  private globalAttackSpeedMultiplier = 1;
  private globalDamageLevel = 0;
  private globalAttackSpeedLevel = 0;
  private baseHpUpgradeLevel = 0;

  private currentShopWave: number | null = null;
  private shopItems: BossShopItem[] = [];
  private readonly purchasedShopIds = new Set<string>();
  private shopRefreshCount = 0;
  private pendingReplacementItem: BossShopItem | null = null;

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
    this.shopDirector = new BossShopDirector();
    this.upgradeOverlay = new UpgradeOverlay(
      this,
      (option) => this.handleUpgradeSelection(option),
      () => this.handleUpgradeReroll(),
    );
    this.branchOverlay = new WeaponBranchOverlay(
      this,
      (weapon, stage, choice) => this.handleBranchSelection(weapon, stage, choice),
    );
    this.bossShopOverlay = new BossShopOverlay(
      this,
      (item) => this.handleShopPurchase(item),
      () => this.handleShopRefresh(),
      () => this.handleLeaveShop(),
    );
    this.replacementOverlay = new WeaponReplacementOverlay(
      this,
      (weaponId) => this.handleReplacementSelection(weaponId),
    );

    const autoCannon = new Weapon(
      this,
      this.projectilePool,
      AUTO_CANNON,
      BATTLEFIELD_WIDTH / 2,
      TURRET_Y,
    );
    this.weapons = [autoCannon];
    this.refreshWeaponModifiers();

    this.createUi();
    this.bindControls();
    this.updateUi();
  }

  update(_time: number, delta: number): void {
    if (this.finished) return;

    if (this.isChoicePaused()) {
      this.updateUi();
      return;
    }

    const simDelta = Math.min(delta, 50) * this.gameSpeed;
    const bossAlive = this.enemies.some((enemy) => enemy.alive && enemy.kind === 'boss');
    const spawnRequests = this.waveManager.update(simDelta, bossAlive);

    for (const request of spawnRequests) {
      this.enemies.push(new Enemy(
        this,
        this.base,
        request.kind,
        request.laneIndex,
        (enemy, rewards) => this.handleEnemyKilled(enemy, rewards),
      ));
    }

    if (this.waveManager.consumeCheckpointClearRequested()) this.clearRemainingEnemies();

    const shopWave = this.waveManager.consumeShopRequested();
    if (shopWave !== null) {
      this.openBossShop(shopWave);
      this.updateUi();
      return;
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
      this.showFinish('M0.8 TEST COMPLETE\nWave 30 Boss Shop loop cleared\nPress R to restart');
    } else if (this.openPendingBranchChoice()) {
      // Weapon milestone choices have priority over queued Run upgrades.
    } else if (this.runState.pendingUpgrades > 0) {
      this.openUpgradeChoice();
    }

    this.updateUi();
  }

  private handleEnemyKilled(_enemy: Enemy, rewards: EnemyRewards): void {
    this.runState.addRewards(rewards.xp, rewards.credits);
  }

  private openUpgradeChoice(): void {
    if (this.openPendingBranchChoice()) return;

    const options = this.upgradeDirector.generate({
      runLevel: this.runState.level,
      currentWave: this.waveManager.wave,
      ownedWeapons: this.weapons.map((weapon) => ({ id: weapon.id, name: weapon.name, level: weapon.level })),
      ownedRandomWeaponIds: [...this.randomWeapons.keys()],
      activeComboIds: [...this.activeCombos],
      globalDamageLevel: this.globalDamageLevel,
      globalAttackSpeedLevel: this.globalAttackSpeedLevel,
      baseHpUpgradeLevel: this.baseHpUpgradeLevel,
    });

    this.upgradeOverlay.show(options, this.runState.getSkipReward(), this.runState.rerollCharges);
  }

  private handleUpgradeReroll(): void {
    if (!this.runState.spendRerollCharge()) return;
    this.openUpgradeChoice();
    this.updateUi();
  }

  private handleUpgradeSelection(option: UpgradeOption | null): void {
    if (option === null) this.runState.addCredits(this.runState.getSkipReward());
    else this.applyUpgrade(option);

    this.runState.consumePendingUpgrade();
    this.continueChoiceFlow();
    this.updateUi();
  }

  private handleBranchSelection(
    weapon: Weapon,
    stage: WeaponBranchStage,
    choice: WeaponBranchChoice,
  ): void {
    weapon.selectBranch(stage, choice.id);
    this.continueChoiceFlow();
    this.updateUi();
  }

  private continueChoiceFlow(): void {
    if (this.finished) return;
    if (this.openPendingBranchChoice()) return;
    if (this.bossShopOverlay.visible) {
      this.refreshBossShopView();
      return;
    }
    if (this.runState.pendingUpgrades > 0) this.openUpgradeChoice();
  }

  private openPendingBranchChoice(): boolean {
    if (this.branchOverlay?.visible) return true;
    const weapon = this.weapons.find((candidate) => candidate.pendingBranchStage !== null);
    if (!weapon) return false;
    const stage = weapon.pendingBranchStage;
    if (!stage) return false;
    const choices = weapon.getBranchChoices(stage);
    if (choices.length === 0) return false;
    this.branchOverlay.show(weapon, stage, choices);
    return true;
  }

  private applyUpgrade(option: UpgradeOption): void {
    switch (option.kind) {
      case 'unlock-weapon':
        if (option.weaponId) this.unlockRandomWeapon(option.weaponId);
        break;
      case 'weapon-level': {
        if (!option.weaponId) break;
        this.weapons.find((candidate) => candidate.id === option.weaponId)?.upgradeLevel();
        break;
      }
      case 'combo':
        if (option.comboId) {
          this.activeCombos.add(option.comboId);
          this.refreshWeaponModifiers();
        }
        break;
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
    }
  }

  private openBossShop(wave: number): void {
    this.currentShopWave = wave;
    this.shopRefreshCount = 0;
    this.purchasedShopIds.clear();
    this.shopItems = this.shopDirector.generate(this.getShopContext(wave));
    this.refreshBossShopView();
  }

  private refreshBossShopView(): void {
    if (this.currentShopWave === null) return;
    this.bossShopOverlay.show(
      this.currentShopWave,
      this.shopItems,
      this.purchasedShopIds,
      this.runState.credits,
      this.shopDirector.getRefreshCost(this.shopRefreshCount),
    );
  }

  private handleShopPurchase(item: BossShopItem): void {
    if (this.currentShopWave === null || this.purchasedShopIds.has(item.id)) return;
    if (this.runState.credits < item.cost || !this.canApplyShopItem(item)) return;

    if (item.kind === 'new-weapon' && this.randomWeapons.size >= 4 && item.weaponId) {
      this.pendingReplacementItem = item;
      const replacementLevel = this.shopDirector.getReplacementLevel(this.currentShopWave);
      this.replacementOverlay.show(
        RANDOM_WEAPON_DEFINITIONS[item.weaponId as RandomWeaponId].name,
        replacementLevel,
        [...this.randomWeapons.values()].map((weapon) => ({ id: weapon.id, name: weapon.name, level: weapon.level })),
      );
      return;
    }

    if (!this.runState.spendCredits(item.cost)) return;
    this.applyShopItem(item);
    this.purchasedShopIds.add(item.id);

    if (!this.openPendingBranchChoice()) this.refreshBossShopView();
    this.updateUi();
  }

  private handleShopRefresh(): void {
    if (this.currentShopWave === null || this.replacementOverlay.visible || this.branchOverlay.visible) return;
    const cost = this.shopDirector.getRefreshCost(this.shopRefreshCount);
    if (!this.runState.spendCredits(cost)) return;
    this.shopRefreshCount += 1;
    this.purchasedShopIds.clear();
    this.shopItems = this.shopDirector.generate(this.getShopContext(this.currentShopWave));
    this.refreshBossShopView();
    this.updateUi();
  }

  private handleLeaveShop(): void {
    if (this.replacementOverlay.visible || this.branchOverlay.visible) return;
    this.bossShopOverlay.destroy();
    this.currentShopWave = null;
    this.shopItems = [];
    this.purchasedShopIds.clear();
    this.shopRefreshCount = 0;
    this.waveManager.resumeAfterShop();
    this.continueChoiceFlow();
    this.updateUi();
  }

  private handleReplacementSelection(oldWeaponId: string | null): void {
    const item = this.pendingReplacementItem;
    this.pendingReplacementItem = null;
    if (!item || this.currentShopWave === null) return;
    if (oldWeaponId === null) {
      this.refreshBossShopView();
      return;
    }
    if (!item.weaponId || this.runState.credits < item.cost) {
      this.refreshBossShopView();
      return;
    }

    const oldId = oldWeaponId as RandomWeaponId;
    const newId = item.weaponId as RandomWeaponId;
    if (!this.replaceRandomWeapon(oldId, newId, this.currentShopWave)) {
      this.refreshBossShopView();
      return;
    }

    if (!this.runState.spendCredits(item.cost)) return;
    this.purchasedShopIds.add(item.id);
    if (!this.openPendingBranchChoice()) this.refreshBossShopView();
    this.updateUi();
  }

  private applyShopItem(item: BossShopItem): void {
    switch (item.kind) {
      case 'heal-base':
        this.base.healFraction(0.25);
        break;
      case 'repair-weapon':
        if (item.weaponId) this.weapons.find((weapon) => weapon.id === item.weaponId)?.repairFull();
        break;
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
      case 'weapon-level':
        if (item.weaponId) this.weapons.find((weapon) => weapon.id === item.weaponId)?.upgradeLevel();
        break;
      case 'new-weapon':
        if (item.weaponId) this.unlockRandomWeapon(item.weaponId);
        break;
      case 'combo':
        if (item.comboId) {
          this.activeCombos.add(item.comboId);
          this.refreshWeaponModifiers();
        }
        break;
      case 'reroll-charge':
        this.runState.addRerollCharges(1);
        break;
    }
  }

  private canApplyShopItem(item: BossShopItem): boolean {
    switch (item.kind) {
      case 'heal-base': return this.base.missingHp > 0;
      case 'repair-weapon': return !!item.weaponId && !!this.weapons.find((weapon) => weapon.id === item.weaponId && weapon.missingHp > 0);
      case 'global-damage': return this.globalDamageLevel < 10;
      case 'global-attack-speed': return this.globalAttackSpeedLevel < 10;
      case 'base-max-hp': return this.baseHpUpgradeLevel < 10;
      case 'weapon-level': return !!item.weaponId && !!this.weapons.find((weapon) => weapon.id === item.weaponId && weapon.level < 10);
      case 'new-weapon': return !!item.weaponId && item.weaponId in RANDOM_WEAPON_DEFINITIONS && !this.randomWeapons.has(item.weaponId as RandomWeaponId);
      case 'combo': return !!item.comboId && !this.activeCombos.has(item.comboId);
      case 'reroll-charge': return true;
    }
  }

  private getShopContext(wave: number) {
    return {
      wave,
      baseCurrentHp: this.base.currentHp,
      baseMaxHp: this.base.maxHp,
      weapons: this.weapons.map((weapon) => ({
        id: weapon.id,
        name: weapon.name,
        level: weapon.level,
        currentHp: weapon.currentHp,
        maxHp: weapon.maxHp,
      })),
      ownedRandomWeaponIds: [...this.randomWeapons.keys()],
      activeComboIds: [...this.activeCombos],
      globalDamageLevel: this.globalDamageLevel,
      globalAttackSpeedLevel: this.globalAttackSpeedLevel,
      baseHpUpgradeLevel: this.baseHpUpgradeLevel,
    };
  }

  private replaceRandomWeapon(oldWeaponId: RandomWeaponId, newWeaponId: RandomWeaponId, wave: number): boolean {
    if (oldWeaponId === newWeaponId || this.randomWeapons.has(newWeaponId)) return false;
    const oldWeapon = this.randomWeapons.get(oldWeaponId);
    if (!oldWeapon) return false;

    const index = this.weapons.indexOf(oldWeapon);
    if (index < 1) return false;
    const position = { x: oldWeapon.x, y: oldWeapon.y };
    oldWeapon.destroy();
    this.randomWeapons.delete(oldWeaponId);

    const replacement = new Weapon(
      this,
      this.projectilePool,
      RANDOM_WEAPON_DEFINITIONS[newWeaponId],
      position.x,
      position.y,
    );
    replacement.upgradeToLevel(this.shopDirector.getReplacementLevel(wave));
    this.randomWeapons.set(newWeaponId, replacement);
    this.weapons[index] = replacement;
    this.refreshWeaponModifiers();
    return true;
  }

  private unlockRandomWeapon(rawWeaponId: string): void {
    if (!(rawWeaponId in RANDOM_WEAPON_DEFINITIONS)) return;
    const weaponId = rawWeaponId as RandomWeaponId;
    if (this.randomWeapons.has(weaponId) || this.randomWeapons.size >= RANDOM_WEAPON_SLOT_POSITIONS.length) return;

    const position = RANDOM_WEAPON_SLOT_POSITIONS[this.randomWeapons.size];
    const weapon = new Weapon(this, this.projectilePool, RANDOM_WEAPON_DEFINITIONS[weaponId], position.x, position.y);
    this.randomWeapons.set(weaponId, weapon);
    this.weapons.push(weapon);
    this.refreshWeaponModifiers();
  }

  private refreshWeaponModifiers(): void {
    const combos = [...this.activeCombos];
    for (const weapon of this.weapons) {
      weapon.setGlobalModifiers(this.globalDamageMultiplier, this.globalAttackSpeedMultiplier);
      weapon.setEnabledCombos(combos);
    }
  }

  private isChoicePaused(): boolean {
    return this.upgradeOverlay.visible
      || this.branchOverlay.visible
      || this.bossShopOverlay.visible
      || this.replacementOverlay.visible;
  }

  private drawBattlefield(): void {
    this.add.rectangle(BATTLEFIELD_WIDTH / 2, BATTLEFIELD_HEIGHT / 2, BATTLEFIELD_WIDTH - 36, BATTLEFIELD_HEIGHT - 36, 0x111827)
      .setStrokeStyle(4, 0x334155);
    this.add.rectangle(BATTLEFIELD_WIDTH / 2, ENEMY_SPAWN_Y, BATTLEFIELD_WIDTH - 80, 76, 0x172554, 0.65);
    this.add.text(44, 36, 'ENEMY SPAWN', { fontSize: '24px', color: '#93c5fd' });
    this.add.text(BATTLEFIELD_WIDTH - 44, 36, 'AIR PATH · W20+', { fontFamily: 'monospace', fontSize: '20px', color: '#7dd3fc' }).setOrigin(1, 0);
    this.add.rectangle(BATTLEFIELD_WIDTH / 2, BASE_ATTACK_Y, BATTLEFIELD_WIDTH - 80, 4, 0xef4444, 0.55);
    this.add.text(44, BASE_ATTACK_Y - 38, 'BASE ATTACK LINE', { fontSize: '20px', color: '#fca5a5' });

    for (const offset of [-160, -80, 0, 80, 160]) {
      this.add.line(0, 0, BATTLEFIELD_WIDTH / 2 + offset, ENEMY_SPAWN_Y + 60, BATTLEFIELD_WIDTH / 2, BASE_ATTACK_Y, 0x334155, 0.28).setOrigin(0, 0);
    }
    for (const offset of [-260, 0, 260]) {
      this.add.line(0, 0, BATTLEFIELD_WIDTH / 2 + offset, ENEMY_SPAWN_Y + 90, BATTLEFIELD_WIDTH / 2, BASE_ATTACK_Y, 0x0ea5e9, 0.12).setOrigin(0, 0);
    }
  }

  private createUi(): void {
    const style = { fontFamily: 'monospace', fontSize: '28px', color: '#f8fafc' };
    this.waveText = this.add.text(36, 138, '', style).setDepth(10);
    this.enemyText = this.add.text(36, 178, '', style).setDepth(10);
    this.runText = this.add.text(36, 218, '', style).setDepth(10);
    this.creditsText = this.add.text(36, 258, '', style).setDepth(10);
    this.baseText = this.add.text(36, BATTLEFIELD_HEIGHT - 265, '', { ...style, fontSize: '21px' }).setDepth(10);
    this.weaponText = this.add.text(36, BATTLEFIELD_HEIGHT - 225, '', { ...style, fontSize: '14px' }).setDepth(10);
    this.debugText = this.add.text(BATTLEFIELD_WIDTH - 36, 36, '', { ...style, fontSize: '19px', align: 'right' }).setOrigin(1, 0).setDepth(10);
    this.statusText = this.add.text(BATTLEFIELD_WIDTH / 2, BATTLEFIELD_HEIGHT / 2, '', {
      ...style, fontSize: '44px', align: 'center', backgroundColor: '#020617cc', padding: { x: 28, y: 22 },
    }).setOrigin(0.5).setDepth(20).setVisible(false);
  }

  private updateUi(): void {
    const heavyCount = this.enemies.filter((enemy) => enemy.kind === 'heavy').length;
    const airCount = this.enemies.filter((enemy) => enemy.domain === 'AIR').length;
    const hasSecondaryAa = [...this.randomWeapons.keys()].some((id) => id === 'lmg' || id === 'sniper');

    this.waveText.setText(`Wave ${this.waveManager.wave}${this.waveManager.isBossWave ? '  BOSS GATE' : ''}`);
    this.enemyText.setText(`Enemies ${this.enemies.length}${heavyCount > 0 ? ` · Heavy ${heavyCount}` : ''}${airCount > 0 ? ` · Air ${airCount}` : ''}`);
    this.runText.setText(`Run Lv ${this.runState.level}  EXP ${this.runState.xp}/${this.runState.xpToNextLevel}`);
    this.creditsText.setText(`Credits ${this.runState.credits} · Reroll ${this.runState.rerollCharges}`);
    this.baseText.setText(`Base HP ${Math.ceil(this.base.currentHp)} / ${this.base.maxHp}`);

    this.weaponText.setText(this.weapons.map((weapon, index) => (
      `S${index + 1} ${weapon.progressionLabel} · HP ${Math.ceil(weapon.currentHp)}/${weapon.maxHp} · Ammo ${weapon.ammoLabel} · ${weapon.currentState}`
    )));

    this.debugText.setText([
      `Speed ${this.gameSpeed}x${this.isChoicePaused() ? ' · PAUSED' : ''}`,
      `Weapons ${this.weapons.length}/5 · Secondary AA ${hasSecondaryAa ? 'YES' : 'NO'}`,
      `Combos ${this.activeCombos.size}/4`,
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
