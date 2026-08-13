import * as Phaser from 'phaser';
import { BATTLEFIELD_WIDTH } from '../combat/constants';
import { publishRuntimeProbe } from '../dev/RuntimeProbe';
import type { PermanentSave, TechId } from '../meta/PermanentProgress';
import { SaveService } from '../meta/SaveService';
import { TECH_DEFINITIONS, TechTree, type TechDefinition } from '../meta/TechTree';

const HEX_RADIUS = 94;
const TREE_CENTER = { x: 500, y: 650 } as const;

const TECH_POSITIONS: Readonly<Record<TechId, { x: number; y: number; branch: string }>> = {
  'damage-training': { x: 500, y: 360, branch: '火力' },
  'base-fortification': { x: 330, y: 505, branch: '生存' },
  'starting-credits': { x: 670, y: 505, branch: '经济' },
  'speed-control': { x: 330, y: 795, branch: '节奏' },
  'reroll-prep': { x: 670, y: 795, branch: '构筑' },
};

const FUTURE_NODES = [
  { x: 160, y: 650, label: '待扩展' },
  { x: 840, y: 650, label: '待扩展' },
  { x: 500, y: 940, label: '待扩展' },
] as const;

export class TechTreeScene extends Phaser.Scene {
  private save!: PermanentSave;
  private root!: Phaser.GameObjects.Container;
  private selectedId: TechId = 'damage-training';

  constructor() {
    super('TechTreeScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x07101f);
    this.save = SaveService.load();
    this.render();
  }

  private render(): void {
    this.root?.destroy(true);
    this.root = this.add.container(0, 0);
    publishRuntimeProbe({ scene: 'tech-tree' });

    this.root.add(this.add.text(BATTLEFIELD_WIDTH / 2, 74, '局外科技', {
      fontFamily: 'monospace', fontSize: '48px', color: '#f8fafc', fontStyle: 'bold',
    }).setOrigin(0.5));
    this.root.add(this.add.text(BATTLEFIELD_WIDTH / 2, 132, '以防线核心为起点 · 蜂窝节点向外扩展', {
      fontFamily: 'monospace', fontSize: '20px', color: '#94a3b8',
    }).setOrigin(0.5));

    this.root.add(this.add.rectangle(500, 200, 620, 64, 0x0f172a, 0.96)
      .setStrokeStyle(2, 0x334155));
    this.root.add(this.add.text(500, 200,
      `账号等级 ${this.save.accountLevel}   ·   金币 ${this.save.gold}   ·   科技点 ${this.save.techPoints}`,
      { fontFamily: 'monospace', fontSize: '21px', color: '#e2e8f0', fontStyle: 'bold' },
    ).setOrigin(0.5));

    this.drawConnections();
    this.drawCoreNode();

    for (const definition of TECH_DEFINITIONS) this.drawTechNode(definition);
    for (const future of FUTURE_NODES) this.drawFutureNode(future.x, future.y, future.label);

    this.drawDetailPanel();
    this.addSmallButton(255, 1510, 370, 70, '免费重置全部科技', 0x3f3f46, () => {
      TechTree.resetAll(this.save);
      SaveService.save(this.save);
      this.render();
    });
    this.addSmallButton(745, 1510, 370, 70, '返回主界面', 0x1e3a5f, () => {
      SaveService.save(this.save);
      this.scene.start('MainMenuScene');
    });
  }

  private drawConnections(): void {
    const graphics = this.add.graphics();
    this.root.add(graphics);

    for (const definition of TECH_DEFINITIONS) {
      const position = TECH_POSITIONS[definition.id];
      const active = TechTree.getLevel(this.save, definition.id) > 0;
      this.drawLink(graphics, TREE_CENTER.x, TREE_CENTER.y, position.x, position.y, active);
    }

    const left = FUTURE_NODES[0];
    const right = FUTURE_NODES[1];
    const bottom = FUTURE_NODES[2];
    const base = TECH_POSITIONS['base-fortification'];
    const speed = TECH_POSITIONS['speed-control'];
    const credits = TECH_POSITIONS['starting-credits'];
    const reroll = TECH_POSITIONS['reroll-prep'];
    this.drawLink(graphics, base.x, base.y, left.x, left.y, false);
    this.drawLink(graphics, speed.x, speed.y, left.x, left.y, false);
    this.drawLink(graphics, credits.x, credits.y, right.x, right.y, false);
    this.drawLink(graphics, reroll.x, reroll.y, right.x, right.y, false);
    this.drawLink(graphics, speed.x, speed.y, bottom.x, bottom.y, false);
    this.drawLink(graphics, reroll.x, reroll.y, bottom.x, bottom.y, false);
  }

  private drawLink(
    graphics: Phaser.GameObjects.Graphics,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    active: boolean,
  ): void {
    graphics.lineStyle(active ? 7 : 4, active ? 0x38bdf8 : 0x334155, active ? 0.92 : 0.55);
    graphics.beginPath();
    graphics.moveTo(x1, y1);
    graphics.lineTo(x2, y2);
    graphics.strokePath();
  }

  private drawCoreNode(): void {
    const container = this.add.container(TREE_CENTER.x, TREE_CENTER.y);
    const graphics = this.add.graphics();
    this.paintHex(graphics, 0x0c4a6e, 0x7dd3fc, 6);
    const title = this.add.text(0, -14, '防线核心', {
      fontFamily: 'monospace', fontSize: '23px', color: '#f0f9ff', fontStyle: 'bold',
    }).setOrigin(0.5);
    const subtitle = this.add.text(0, 22, `账号 ${this.save.accountLevel}级`, {
      fontFamily: 'monospace', fontSize: '17px', color: '#bae6fd',
    }).setOrigin(0.5);
    container.add([graphics, title, subtitle]);
    this.root.add(container);
  }

  private drawTechNode(definition: TechDefinition): void {
    const position = TECH_POSITIONS[definition.id];
    const level = TechTree.getLevel(this.save, definition.id);
    const maxed = level >= definition.maxLevel;
    const cost = maxed ? 0 : definition.costForNextLevel(level);
    const canAfford = maxed || this.canAfford(definition, cost);
    const selected = definition.id === this.selectedId;

    const fill = maxed
      ? 0x14532d
      : selected
        ? 0x78350f
        : canAfford
          ? 0x172554
          : 0x111827;
    const stroke = maxed
      ? 0x86efac
      : selected
        ? 0xfbbf24
        : canAfford
          ? 0x60a5fa
          : 0x334155;

    const container = this.add.container(position.x, position.y);
    const graphics = this.add.graphics();
    this.paintHex(graphics, fill, stroke, selected ? 7 : 4);
    const branch = this.add.text(0, -39, position.branch, {
      fontFamily: 'monospace', fontSize: '15px', color: selected ? '#fde68a' : '#94a3b8',
    }).setOrigin(0.5);
    const title = this.add.text(0, -4, definition.name, {
      fontFamily: 'monospace', fontSize: '20px', color: '#f8fafc', fontStyle: 'bold',
    }).setOrigin(0.5);
    const levelText = this.add.text(0, 34, maxed ? 'MAX' : `${level}/${definition.maxLevel}`, {
      fontFamily: 'monospace', fontSize: '17px', color: maxed ? '#bbf7d0' : '#cbd5e1',
    }).setOrigin(0.5);

    container.add([graphics, branch, title, levelText]);
    container.setSize(HEX_RADIUS * 1.75, HEX_RADIUS * 1.65)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        this.selectedId = definition.id;
        this.render();
      });
    this.root.add(container);
  }

  private drawFutureNode(x: number, y: number, label: string): void {
    const container = this.add.container(x, y);
    const graphics = this.add.graphics();
    this.paintHex(graphics, 0x0b1220, 0x263244, 3);
    const text = this.add.text(0, 0, label, {
      fontFamily: 'monospace', fontSize: '17px', color: '#475569', fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add([graphics, text]);
    this.root.add(container);
  }

  private paintHex(graphics: Phaser.GameObjects.Graphics, fill: number, stroke: number, lineWidth: number): void {
    const points = Array.from({ length: 6 }, (_, index) => {
      const angle = Phaser.Math.DegToRad(60 * index - 30);
      return {
        x: Math.cos(angle) * HEX_RADIUS,
        y: Math.sin(angle) * HEX_RADIUS,
      };
    });

    graphics.fillStyle(fill, 0.98);
    graphics.lineStyle(lineWidth, stroke, 1);
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) graphics.lineTo(points[index].x, points[index].y);
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
  }

  private drawDetailPanel(): void {
    const definition = TECH_DEFINITIONS.find((entry) => entry.id === this.selectedId) ?? TECH_DEFINITIONS[0];
    const level = TechTree.getLevel(this.save, definition.id);
    const maxed = level >= definition.maxLevel;
    const cost = maxed ? 0 : definition.costForNextLevel(level);
    const canAfford = !maxed && this.canAfford(definition, cost);
    const position = TECH_POSITIONS[definition.id];
    const currency = definition.currency === 'GOLD' ? '金币' : '科技点';

    this.root.add(this.add.rectangle(500, 1245, 920, 300, 0x0f172a, 0.98)
      .setStrokeStyle(3, 0x334155));
    this.root.add(this.add.text(75, 1120, `${definition.name}  ${level}/${definition.maxLevel}`, {
      fontFamily: 'monospace', fontSize: '29px', color: '#f8fafc', fontStyle: 'bold',
    }));
    this.root.add(this.add.text(75, 1170, `分支：${position.branch}`, {
      fontFamily: 'monospace', fontSize: '18px', color: '#7dd3fc',
    }));
    this.root.add(this.add.text(75, 1210, definition.description, {
      fontFamily: 'monospace', fontSize: '19px', color: '#cbd5e1', wordWrap: { width: 560 },
    }));
    this.root.add(this.add.text(75, 1300,
      maxed ? '该节点已达到最大等级' : `下一等级：${cost} ${currency}`,
      { fontFamily: 'monospace', fontSize: '20px', color: maxed ? '#86efac' : canAfford ? '#fcd34d' : '#64748b' },
    ));

    const button = this.add.rectangle(755, 1290, 300, 92, canAfford ? 0x1d4ed8 : 0x1f2937)
      .setStrokeStyle(3, canAfford ? 0x93c5fd : 0x475569);
    const label = this.add.text(755, 1290, maxed ? '已满级' : canAfford ? '升级节点' : '资源不足', {
      fontFamily: 'monospace', fontSize: '24px', color: canAfford ? '#f8fafc' : '#64748b', fontStyle: 'bold',
    }).setOrigin(0.5);
    if (canAfford) {
      button.setInteractive({ useHandCursor: true });
      button.on('pointerup', () => {
        if (!TechTree.buy(this.save, definition.id)) return;
        SaveService.save(this.save);
        this.render();
      });
    }
    this.root.add([button, label]);
  }

  private canAfford(definition: TechDefinition, cost: number): boolean {
    return definition.currency === 'GOLD' ? this.save.gold >= cost : this.save.techPoints >= cost;
  }

  private addSmallButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    color: number,
    onClick: () => void,
  ): void {
    const button = this.add.rectangle(x, y, width, height, color)
      .setStrokeStyle(3, 0x64748b)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontFamily: 'monospace', fontSize: '22px', color: '#f8fafc', fontStyle: 'bold',
    }).setOrigin(0.5);
    button.on('pointerup', onClick);
    this.root.add([button, text]);
  }
}
