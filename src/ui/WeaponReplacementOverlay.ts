import * as Phaser from 'phaser';
import { BATTLEFIELD_HEIGHT, BATTLEFIELD_WIDTH } from '../combat/constants';

export interface ReplacementCandidate {
  id: string;
  name: string;
  level: number;
}

export class WeaponReplacementOverlay {
  private container: Phaser.GameObjects.Container | null = null;
  private choosing = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onSelect: (weaponId: string | null) => void,
  ) {}

  get visible(): boolean { return this.container !== null; }

  show(newWeaponName: string, replacementLevel: number, candidates: readonly ReplacementCandidate[]): void {
    this.destroy();
    this.choosing = false;

    const container = this.scene.add.container(0, 0).setDepth(140);
    this.container = container;
    container.add(this.scene.add.rectangle(
      BATTLEFIELD_WIDTH / 2,
      BATTLEFIELD_HEIGHT / 2,
      BATTLEFIELD_WIDTH,
      BATTLEFIELD_HEIGHT,
      0x020617,
      0.98,
    ));

    container.add(this.scene.add.text(BATTLEFIELD_WIDTH / 2, 170, '选择要替换的武器', {
      fontFamily: 'monospace', fontSize: '52px', color: '#f8fafc', fontStyle: 'bold',
    }).setOrigin(0.5));
    container.add(this.scene.add.text(BATTLEFIELD_WIDTH / 2, 255, `${newWeaponName} 将以 Lv${replacementLevel} 部署\n旧武器路线与专精永久丢失`, {
      fontFamily: 'monospace', fontSize: '29px', color: '#fca5a5', align: 'center', lineSpacing: 10,
    }).setOrigin(0.5));

    candidates.forEach((candidate, index) => {
      const y = 470 + index * 195;
      const card = this.scene.add.rectangle(BATTLEFIELD_WIDTH / 2, y, 880, 150, 0x172033)
        .setStrokeStyle(5, 0xf59e0b)
        .setInteractive({ useHandCursor: true });
      const text = this.scene.add.text(BATTLEFIELD_WIDTH / 2, y, `${candidate.name} · Lv${candidate.level}`, {
        fontFamily: 'monospace', fontSize: '36px', color: '#f8fafc', fontStyle: 'bold',
      }).setOrigin(0.5);
      card.on('pointerover', () => card.setFillStyle(0x1e293b));
      card.on('pointerout', () => card.setFillStyle(0x172033));
      card.on('pointerup', () => this.choose(candidate.id));
      container.add([card, text]);
    });

    const cancel = this.scene.add.rectangle(BATTLEFIELD_WIDTH / 2, 1325, 560, 112, 0x1f2937)
      .setStrokeStyle(4, 0x64748b)
      .setInteractive({ useHandCursor: true });
    const cancelText = this.scene.add.text(BATTLEFIELD_WIDTH / 2, 1325, '取消替换', {
      fontFamily: 'monospace', fontSize: '30px', color: '#cbd5e1', fontStyle: 'bold',
    }).setOrigin(0.5);
    cancel.on('pointerup', () => this.choose(null));
    container.add([cancel, cancelText]);
  }

  destroy(): void {
    this.container?.destroy(true);
    this.container = null;
  }

  private choose(weaponId: string | null): void {
    if (this.choosing) return;
    this.choosing = true;
    this.destroy();
    this.onSelect(weaponId);
  }
}
