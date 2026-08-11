import * as Phaser from 'phaser';
import { BATTLEFIELD_HEIGHT, BATTLEFIELD_WIDTH } from '../combat/constants';
import type { BossShopItem } from '../shop/BossShopDirector';

export class BossShopOverlay {
  private container: Phaser.GameObjects.Container | null = null;
  private choosing = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onPurchase: (item: BossShopItem) => void,
    private readonly onRefresh: () => void,
    private readonly onLeave: () => void,
  ) {}

  get visible(): boolean { return this.container !== null; }

  show(
    checkpointWave: number,
    items: readonly BossShopItem[],
    purchasedIds: ReadonlySet<string>,
    credits: number,
    refreshCost: number,
  ): void {
    this.destroy();
    this.choosing = false;

    const container = this.scene.add.container(0, 0).setDepth(110);
    this.container = container;

    container.add(this.scene.add.rectangle(
      BATTLEFIELD_WIDTH / 2,
      BATTLEFIELD_HEIGHT / 2,
      BATTLEFIELD_WIDTH,
      BATTLEFIELD_HEIGHT,
      0x020617,
      0.96,
    ));

    container.add(this.scene.add.text(BATTLEFIELD_WIDTH / 2, 105, `BOSS SHOP · WAVE ${checkpointWave}`, {
      fontFamily: 'monospace', fontSize: '46px', color: '#f8fafc', fontStyle: 'bold',
    }).setOrigin(0.5));
    container.add(this.scene.add.text(BATTLEFIELD_WIDTH / 2, 165, `Credits ${credits} · 战斗完全暂停`, {
      fontFamily: 'monospace', fontSize: '23px', color: '#94a3b8',
    }).setOrigin(0.5));

    items.forEach((item, index) => {
      const y = 315 + index * 205;
      const sold = purchasedIds.has(item.id);
      const affordable = credits >= item.cost;
      const stroke = item.rarity === 'EPIC' ? 0xc084fc : item.rarity === 'RARE' ? 0x4ade80 : 0x64748b;
      const fill = sold ? 0x111827 : 0x172033;
      const card = this.scene.add.rectangle(BATTLEFIELD_WIDTH / 2, y, 820, 165, fill)
        .setStrokeStyle(4, stroke);

      if (!sold) card.setInteractive({ useHandCursor: true });
      const rarity = item.rarity === 'EPIC' ? '史诗' : item.rarity === 'RARE' ? '稀有' : '普通';
      container.add(this.scene.add.text(125, y - 57, `${rarity} · ${sold ? 'SOLD' : `${item.cost} C`}`, {
        fontFamily: 'monospace', fontSize: '18px', color: sold ? '#64748b' : affordable ? '#fde68a' : '#f87171',
      }));
      container.add(this.scene.add.text(125, y - 20, item.title, {
        fontFamily: 'monospace', fontSize: '29px', color: sold ? '#64748b' : '#f8fafc', fontStyle: 'bold',
      }));
      container.add(this.scene.add.text(125, y + 25, item.description, {
        fontFamily: 'monospace', fontSize: '20px', color: sold ? '#475569' : '#cbd5e1',
      }));

      if (!sold) {
        card.on('pointerover', () => card.setFillStyle(0x1e293b));
        card.on('pointerout', () => card.setFillStyle(fill));
        card.on('pointerup', () => this.purchase(item));
      }
      container.add(card);
    });

    const refreshButton = this.scene.add.rectangle(290, 1405, 410, 95, 0x1f2937)
      .setStrokeStyle(3, credits >= refreshCost ? 0x38bdf8 : 0x7f1d1d)
      .setInteractive({ useHandCursor: true });
    const refreshText = this.scene.add.text(290, 1405, `刷新商店 · ${refreshCost} C`, {
      fontFamily: 'monospace', fontSize: '22px', color: credits >= refreshCost ? '#7dd3fc' : '#f87171', fontStyle: 'bold',
    }).setOrigin(0.5);
    refreshButton.on('pointerup', () => { if (!this.choosing) this.onRefresh(); });

    const leaveButton = this.scene.add.rectangle(735, 1405, 310, 95, 0x14532d)
      .setStrokeStyle(3, 0x4ade80)
      .setInteractive({ useHandCursor: true });
    const leaveText = this.scene.add.text(735, 1405, '离开商店', {
      fontFamily: 'monospace', fontSize: '24px', color: '#bbf7d0', fontStyle: 'bold',
    }).setOrigin(0.5);
    leaveButton.on('pointerup', () => { if (!this.choosing) this.onLeave(); });

    container.add([refreshButton, refreshText, leaveButton, leaveText]);
  }

  destroy(): void {
    this.container?.destroy(true);
    this.container = null;
  }

  private purchase(item: BossShopItem): void {
    if (this.choosing) return;
    this.onPurchase(item);
  }
}
