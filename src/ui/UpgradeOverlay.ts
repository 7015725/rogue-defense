import * as Phaser from 'phaser';
import { BATTLEFIELD_HEIGHT, BATTLEFIELD_WIDTH } from '../combat/constants';
import type { UpgradeOption } from '../upgrades/UpgradeDirectorLite';

export class UpgradeOverlay {
  private container: Phaser.GameObjects.Container | null = null;
  private choosing = false;
  private optionsValue: UpgradeOption[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onSelect: (option: UpgradeOption | null) => void,
    private readonly onReroll: () => void,
  ) {}

  get visible(): boolean {
    return this.container !== null;
  }

  get optionIds(): readonly string[] {
    return this.optionsValue.map((option) => option.id);
  }

  selectIndex(index: number): boolean {
    if (!this.visible || this.choosing || this.optionsValue.length === 0) return false;
    const safeIndex = Phaser.Math.Clamp(Math.floor(index), 0, this.optionsValue.length - 1);
    const option = this.optionsValue[safeIndex];
    if (!option) return false;
    this.choose(option);
    return true;
  }

  show(options: readonly UpgradeOption[], skipReward: number, rerollCharges: number): void {
    this.destroy();
    this.choosing = false;
    this.optionsValue = [...options];

    const container = this.scene.add.container(0, 0).setDepth(100);
    this.container = container;

    const backdrop = this.scene.add.rectangle(
      BATTLEFIELD_WIDTH / 2,
      BATTLEFIELD_HEIGHT / 2,
      BATTLEFIELD_WIDTH,
      BATTLEFIELD_HEIGHT,
      0x020617,
      0.95,
    );
    container.add(backdrop);

    container.add(this.scene.add.text(BATTLEFIELD_WIDTH / 2, 145, '升级选择', {
      fontFamily: 'monospace', fontSize: '58px', color: '#f8fafc', fontStyle: 'bold',
    }).setOrigin(0.5));

    container.add(this.scene.add.text(BATTLEFIELD_WIDTH / 2, 215, `战斗已暂停 · 重抽 ${rerollCharges}`, {
      fontFamily: 'monospace', fontSize: '29px', color: '#94a3b8',
    }).setOrigin(0.5));

    options.forEach((option, index) => {
      const y = 390 + index * 275;
      const card = this.scene.add.rectangle(BATTLEFIELD_WIDTH / 2, y, 900, 225, 0x172033)
        .setStrokeStyle(5, option.rarity === 'RARE' ? 0x4ade80 : 0x64748b)
        .setInteractive({ useHandCursor: true });

      const rarity = this.scene.add.text(85, y - 76, option.rarity === 'RARE' ? '稀有' : '普通', {
        fontFamily: 'monospace', fontSize: '25px', color: option.rarity === 'RARE' ? '#86efac' : '#cbd5e1',
      });
      const title = this.scene.add.text(85, y - 34, option.title, {
        fontFamily: 'monospace', fontSize: '39px', color: '#f8fafc', fontStyle: 'bold',
      });
      const description = this.scene.add.text(85, y + 22, option.description, {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#cbd5e1',
        wordWrap: { width: 830 },
        lineSpacing: 8,
      });

      card.on('pointerover', () => card.setFillStyle(0x1e293b));
      card.on('pointerout', () => card.setFillStyle(0x172033));
      card.on('pointerup', () => this.choose(option));
      container.add([card, rarity, title, description]);
    });

    const rerollButton = this.scene.add.rectangle(295, 1285, 440, 112, 0x172554)
      .setStrokeStyle(4, rerollCharges > 0 ? 0x38bdf8 : 0x475569);
    const rerollText = this.scene.add.text(295, 1285, rerollCharges > 0 ? '重抽 · 消耗 1 次' : '重抽 · 无次数', {
      fontFamily: 'monospace', fontSize: '28px', color: rerollCharges > 0 ? '#7dd3fc' : '#64748b', fontStyle: 'bold',
    }).setOrigin(0.5);
    if (rerollCharges > 0) {
      rerollButton.setInteractive({ useHandCursor: true });
      rerollButton.on('pointerup', () => this.reroll());
    }

    const skipButton = this.scene.add.rectangle(745, 1285, 360, 112, 0x1f2937)
      .setStrokeStyle(4, 0xf59e0b)
      .setInteractive({ useHandCursor: true });
    const skipText = this.scene.add.text(745, 1285, `跳过 · +${skipReward} C`, {
      fontFamily: 'monospace', fontSize: '28px', color: '#fcd34d', fontStyle: 'bold',
    }).setOrigin(0.5);
    skipButton.on('pointerup', () => this.choose(null));
    container.add([rerollButton, rerollText, skipButton, skipText]);
  }

  destroy(): void {
    this.container?.destroy(true);
    this.container = null;
    this.optionsValue = [];
  }

  private choose(option: UpgradeOption | null): void {
    if (this.choosing) return;
    this.choosing = true;
    this.destroy();
    this.onSelect(option);
  }

  private reroll(): void {
    if (this.choosing) return;
    this.choosing = true;
    this.destroy();
    this.onReroll();
  }
}
