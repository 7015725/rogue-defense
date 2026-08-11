import * as Phaser from 'phaser';
import { BATTLEFIELD_WIDTH } from '../combat/constants';
import { isRuntimeProbeEnabled, publishRuntimeProbe } from '../dev/RuntimeProbe';
import {
  DIFFICULTIES,
  getAccountXpToNext,
  type PermanentSave,
} from '../meta/PermanentProgress';
import { SaveService } from '../meta/SaveService';
import { TECH_DEFINITIONS, TechTree } from '../meta/TechTree';

const DEV_WAVE_PRESETS = [1, 10, 20, 50, 80, 100] as const;

export class MainMenuScene extends Phaser.Scene {
  private save!: PermanentSave;
  private root!: Phaser.GameObjects.Container;
  private readonly devToolsEnabled = isRuntimeProbeEnabled();
  private devStartWave = 1;
  private devStressCount = 0;

  constructor() {
    super('MainMenuScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x0b1120);
    this.save = SaveService.load();
    this.render();
  }

  private render(): void {
    this.root?.destroy(true);
    this.root = this.add.container(0, 0);

    publishRuntimeProbe({
      scene: 'menu',
      startWave: this.devStartWave,
      stressCount: this.devStressCount,
    });

    this.root.add(this.add.text(BATTLEFIELD_WIDTH / 2, 95, 'ROGUE DEFENSE', {
      fontFamily: 'monospace',
      fontSize: '64px',
      color: '#f8fafc',
      fontStyle: 'bold',
    }).setOrigin(0.5));

    this.root.add(this.add.text(BATTLEFIELD_WIDTH / 2, 168, '纵向 Roguelite Tower Defense', {
      fontFamily: 'monospace',
      fontSize: '25px',
      color: '#94a3b8',
    }).setOrigin(0.5));

    const xpRequired = getAccountXpToNext(this.save.accountLevel);
    const xpLabel = xpRequired > 0 ? `${this.save.accountXp}/${xpRequired}` : 'MAX';
    this.root.add(this.add.text(54, 245, [
      `Account Lv ${this.save.accountLevel}  EXP ${xpLabel}`,
      `Gold ${this.save.gold}  ·  Tech Point ${this.save.techPoints}`,
      `Runs ${this.save.lifetime.runs}  ·  Kills ${this.save.lifetime.kills}  ·  Boss ${this.save.lifetime.bossKills}`,
    ], {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#e2e8f0',
      lineSpacing: 10,
    }));

    if (this.devToolsEnabled) this.renderDevLaunchPanel();

    this.root.add(this.add.text(54, 390, '难度', {
      fontFamily: 'monospace', fontSize: '32px', color: '#f8fafc', fontStyle: 'bold',
    }));

    DIFFICULTIES.forEach((difficulty, index) => {
      const unlocked = difficulty.id <= this.save.maxDifficultyUnlocked;
      const selected = difficulty.id === this.save.selectedDifficulty;
      const x = 116 + index * 190;
      const button = this.add.rectangle(
        x,
        480,
        155,
        120,
        selected ? 0x1d4ed8 : unlocked ? 0x172033 : 0x111827,
      ).setStrokeStyle(4, selected ? 0x93c5fd : unlocked ? 0x475569 : 0x1f2937);

      if (unlocked) {
        button.setInteractive({ useHandCursor: true });
        button.on('pointerup', () => {
          this.save.selectedDifficulty = difficulty.id;
          SaveService.save(this.save);
          this.render();
        });
      }

      const highWave = this.save.highWaveByDifficulty[index] ?? 0;
      this.root.add(button);
      this.root.add(this.add.text(x, 462, `难度 ${difficulty.label}`, {
        fontFamily: 'monospace', fontSize: '24px', color: unlocked ? '#f8fafc' : '#64748b', fontStyle: 'bold',
      }).setOrigin(0.5));
      this.root.add(this.add.text(x, 503, unlocked ? `最高 W${highWave}` : 'LOCKED', {
        fontFamily: 'monospace', fontSize: '18px', color: unlocked ? '#cbd5e1' : '#475569',
      }).setOrigin(0.5));
    });

    const selectedDifficulty = DIFFICULTIES[this.save.selectedDifficulty - 1];
    this.root.add(this.add.text(54, 575,
      `当前：难度 ${selectedDifficulty.label} · Enemy HP ×${selectedDifficulty.enemyHpMultiplier.toFixed(2)} · Damage ×${selectedDifficulty.enemyDamageMultiplier.toFixed(2)} · Reward ×${selectedDifficulty.rewardMultiplier.toFixed(2)}`,
      { fontFamily: 'monospace', fontSize: '19px', color: '#93c5fd' },
    ));

    const devSuffix = this.devToolsEnabled
      ? ` · DEV W${this.devStartWave}${this.devStressCount > 0 ? ` + ${this.devStressCount} Stress` : ''}`
      : '';
    this.addButton(BATTLEFIELD_WIDTH / 2, 675, 620, 110, `开始一局${devSuffix}`, 0x1d4ed8, () => {
      SaveService.save(this.save);
      this.scene.start('CombatScene', {
        difficulty: this.save.selectedDifficulty,
        startWave: this.devToolsEnabled ? this.devStartWave : 1,
        stressCount: this.devToolsEnabled ? this.devStressCount : 0,
      });
    });

    this.root.add(this.add.text(54, 790, '局外科技', {
      fontFamily: 'monospace', fontSize: '32px', color: '#f8fafc', fontStyle: 'bold',
    }));

    TECH_DEFINITIONS.forEach((definition, index) => {
      const level = TechTree.getLevel(this.save, definition.id);
      const maxed = level >= definition.maxLevel;
      const cost = maxed ? 0 : definition.costForNextLevel(level);
      const y = 870 + index * 112;
      const currency = definition.currency === 'GOLD' ? 'Gold' : 'TP';
      const canAfford = maxed || (definition.currency === 'GOLD' ? this.save.gold >= cost : this.save.techPoints >= cost);

      const card = this.add.rectangle(BATTLEFIELD_WIDTH / 2, y, 900, 94, 0x172033)
        .setStrokeStyle(3, maxed ? 0x22c55e : canAfford ? 0x64748b : 0x334155);
      if (!maxed && canAfford) {
        card.setInteractive({ useHandCursor: true });
        card.on('pointerup', () => {
          if (TechTree.buy(this.save, definition.id)) {
            SaveService.save(this.save);
            this.render();
          }
        });
      }
      this.root.add(card);
      this.root.add(this.add.text(78, y - 28, `${definition.name}  Lv${level}/${definition.maxLevel}`, {
        fontFamily: 'monospace', fontSize: '22px', color: '#f8fafc', fontStyle: 'bold',
      }));
      this.root.add(this.add.text(78, y + 8, definition.description, {
        fontFamily: 'monospace', fontSize: '17px', color: '#cbd5e1',
      }));
      this.root.add(this.add.text(900, y, maxed ? 'MAX' : `${cost} ${currency}`, {
        fontFamily: 'monospace', fontSize: '20px', color: maxed ? '#86efac' : canAfford ? '#fcd34d' : '#64748b',
      }).setOrigin(1, 0.5));
    });

    this.addButton(BATTLEFIELD_WIDTH / 2, 1470, 450, 72, '免费重置全部科技', 0x3f3f46, () => {
      TechTree.resetAll(this.save);
      SaveService.save(this.save);
      this.render();
    });
  }

  private renderDevLaunchPanel(): void {
    this.root.add(this.add.text(650, 228, 'DEV LAUNCH', {
      fontFamily: 'monospace', fontSize: '17px', color: '#fbbf24', fontStyle: 'bold',
    }));

    DEV_WAVE_PRESETS.forEach((wave, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      this.addSmallButton(
        700 + column * 105,
        270 + row * 52,
        92,
        42,
        `W${wave}`,
        this.devStartWave === wave ? 0x92400e : 0x3f3f46,
        () => {
          this.devStartWave = wave;
          this.render();
        },
      );
    });

    this.addSmallButton(
      910,
      378,
      160,
      42,
      this.devStressCount > 0 ? 'Stress 300 ON' : 'Stress 300 OFF',
      this.devStressCount > 0 ? 0x9a3412 : 0x3f3f46,
      () => {
        this.devStressCount = this.devStressCount > 0 ? 0 : 300;
        this.render();
      },
    );
  }

  private addButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    color: number,
    onClick: () => void,
  ): void {
    const button = this.add.rectangle(x, y, width, height, color)
      .setStrokeStyle(4, 0x94a3b8)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontFamily: 'monospace', fontSize: '30px', color: '#f8fafc', fontStyle: 'bold',
    }).setOrigin(0.5);
    button.on('pointerover', () => button.setAlpha(0.82));
    button.on('pointerout', () => button.setAlpha(1));
    button.on('pointerup', onClick);
    this.root.add([button, text]);
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
      .setStrokeStyle(2, 0xfbbf24)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontFamily: 'monospace', fontSize: '14px', color: '#fef3c7', fontStyle: 'bold',
    }).setOrigin(0.5);
    button.on('pointerup', onClick);
    this.root.add([button, text]);
  }
}
