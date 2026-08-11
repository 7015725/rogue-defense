import * as Phaser from 'phaser';
import { BATTLEFIELD_HEIGHT, BATTLEFIELD_WIDTH } from '../combat/constants';
import type { Weapon } from '../entities/Weapon';
import type { WeaponBranchChoice, WeaponBranchStage } from '../weapons/WeaponProgression';

export class WeaponBranchOverlay {
  private container: Phaser.GameObjects.Container | null = null;
  private choosing = false;
  private weaponValue: Weapon | null = null;
  private stageValue: WeaponBranchStage | null = null;
  private choicesValue: WeaponBranchChoice[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onSelect: (weapon: Weapon, stage: WeaponBranchStage, choice: WeaponBranchChoice) => void,
  ) {}

  get visible(): boolean {
    return this.container !== null;
  }

  selectIndex(index: number): boolean {
    if (!this.visible || this.choosing || !this.weaponValue || !this.stageValue || this.choicesValue.length === 0) return false;
    const safeIndex = Phaser.Math.Clamp(Math.floor(index), 0, this.choicesValue.length - 1);
    const choice = this.choicesValue[safeIndex];
    if (!choice) return false;
    this.choose(this.weaponValue, this.stageValue, choice);
    return true;
  }

  show(weapon: Weapon, stage: WeaponBranchStage, choices: readonly WeaponBranchChoice[]): void {
    this.destroy();
    this.choosing = false;
    this.weaponValue = weapon;
    this.stageValue = stage;
    this.choicesValue = [...choices];

    const container = this.scene.add.container(0, 0).setDepth(120);
    this.container = container;

    container.add(this.scene.add.rectangle(
      BATTLEFIELD_WIDTH / 2,
      BATTLEFIELD_HEIGHT / 2,
      BATTLEFIELD_WIDTH,
      BATTLEFIELD_HEIGHT,
      0x020617,
      0.96,
    ));

    container.add(this.scene.add.text(BATTLEFIELD_WIDTH / 2, 145, `${weapon.name} · Lv${stage}`, {
      fontFamily: 'monospace',
      fontSize: '52px',
      color: '#f8fafc',
      fontStyle: 'bold',
    }).setOrigin(0.5));

    container.add(this.scene.add.text(
      BATTLEFIELD_WIDTH / 2,
      215,
      stage === 5 ? '选择本局武器路线 · 选择后锁定' : '选择路线专精 · 选择后锁定',
      {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#94a3b8',
      },
    ).setOrigin(0.5));

    choices.forEach((choice, index) => {
      const y = 405 + index * 305;
      const card = this.scene.add.rectangle(BATTLEFIELD_WIDTH / 2, y, 900, 245, 0x172033)
        .setStrokeStyle(5, stage === 5 ? 0x60a5fa : 0xc084fc)
        .setInteractive({ useHandCursor: true });

      const title = this.scene.add.text(85, y - 72, choice.title, {
        fontFamily: 'monospace',
        fontSize: '39px',
        color: '#f8fafc',
        fontStyle: 'bold',
      });

      const description = this.scene.add.text(85, y - 12, choice.description, {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#cbd5e1',
        wordWrap: { width: 830 },
        lineSpacing: 9,
      });

      card.on('pointerover', () => card.setFillStyle(0x1e293b));
      card.on('pointerout', () => card.setFillStyle(0x172033));
      card.on('pointerup', () => this.choose(weapon, stage, choice));
      container.add([card, title, description]);
    });
  }

  destroy(): void {
    this.container?.destroy(true);
    this.container = null;
    this.weaponValue = null;
    this.stageValue = null;
    this.choicesValue = [];
  }

  private choose(weapon: Weapon, stage: WeaponBranchStage, choice: WeaponBranchChoice): void {
    if (this.choosing) return;
    this.choosing = true;
    this.destroy();
    this.onSelect(weapon, stage, choice);
  }
}
