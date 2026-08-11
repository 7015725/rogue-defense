import * as Phaser from 'phaser';
import { BATTLEFIELD_HEIGHT, BATTLEFIELD_WIDTH } from '../combat/constants';
import type { UpgradeOption } from '../upgrades/UpgradeDirectorLite';

export class UpgradeOverlay {
  private container: Phaser.GameObjects.Container | null = null;
  private choosing = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onSelect: (option: UpgradeOption | null) => void,
  ) {}

  get visible(): boolean {
    return this.container !== null;
  }

  show(options: readonly UpgradeOption[], skipReward: number): void {
    this.destroy();
    this.choosing = false;

    const container = this.scene.add.container(0, 0).setDepth(100);
    this.container = container;

    const backdrop = this.scene.add.rectangle(
      BATTLEFIELD_WIDTH / 2,
      BATTLEFIELD_HEIGHT / 2,
      BATTLEFIELD_WIDTH,
      BATTLEFIELD_HEIGHT,
      0x020617,
      0.92,
    );
    container.add(backdrop);

    container.add(this.scene.add.text(BATTLEFIELD_WIDTH / 2, 260, '升级选择', {
      fontFamily: 'monospace',
      fontSize: '54px',
      color: '#f8fafc',
      fontStyle: 'bold',
    }).setOrigin(0.5));

    container.add(this.scene.add.text(BATTLEFIELD_WIDTH / 2, 330, '战斗已暂停 · 选择 1 项', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#94a3b8',
    }).setOrigin(0.5));

    options.forEach((option, index) => {
      const y = 510 + index * 260;
      const card = this.scene.add.rectangle(BATTLEFIELD_WIDTH / 2, y, 780, 210, 0x172033)
        .setStrokeStyle(4, option.rarity === 'RARE' ? 0x4ade80 : 0x64748b)
        .setInteractive({ useHandCursor: true });

      const rarity = this.scene.add.text(145, y - 72, option.rarity === 'RARE' ? '稀有' : '普通', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: option.rarity === 'RARE' ? '#86efac' : '#cbd5e1',
      });
      const title = this.scene.add.text(145, y - 32, option.title, {
        fontFamily: 'monospace',
        fontSize: '34px',
        color: '#f8fafc',
        fontStyle: 'bold',
      });
      const description = this.scene.add.text(145, y + 22, option.description, {
        fontFamily: 'monospace',
        fontSize: '23px',
        color: '#cbd5e1',
        lineSpacing: 8,
      });

      card.on('pointerover', () => card.setFillStyle(0x1e293b));
      card.on('pointerout', () => card.setFillStyle(0x172033));
      card.on('pointerup', () => this.choose(option));
      container.add([card, rarity, title, description]);
    });

    const skipButton = this.scene.add.rectangle(BATTLEFIELD_WIDTH / 2, 1330, 620, 110, 0x1f2937)
      .setStrokeStyle(3, 0xf59e0b)
      .setInteractive({ useHandCursor: true });
    const skipText = this.scene.add.text(BATTLEFIELD_WIDTH / 2, 1330, `跳过 · 获得 ${skipReward} 战斗币`, {
      fontFamily: 'monospace',
      fontSize: '26px',
      color: '#fcd34d',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    skipButton.on('pointerup', () => this.choose(null));
    container.add([skipButton, skipText]);
  }

  destroy(): void {
    this.container?.destroy(true);
    this.container = null;
  }

  private choose(option: UpgradeOption | null): void {
    if (this.choosing) return;
    this.choosing = true;
    this.destroy();
    this.onSelect(option);
  }
}
