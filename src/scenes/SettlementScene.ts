import * as Phaser from 'phaser';
import { BATTLEFIELD_WIDTH } from '../combat/constants';
import {
  DIFFICULTIES,
  getAccountXpToNext,
  type PermanentSave,
  type RunSummary,
  type SettlementRewards,
} from '../meta/PermanentProgress';
import { PermanentProgressService } from '../meta/PermanentProgressService';
import { SaveService } from '../meta/SaveService';

interface SettlementSceneData {
  summary: RunSummary;
}

export class SettlementScene extends Phaser.Scene {
  private summary!: RunSummary;
  private rewards!: SettlementRewards;
  private displaySave!: PermanentSave;

  constructor() {
    super('SettlementScene');
  }

  init(data: SettlementSceneData): void {
    this.summary = data.summary;
    const persistedSave = SaveService.load();
    const settlementSave = this.summary.debugRun ? structuredClone(persistedSave) : persistedSave;
    this.rewards = PermanentProgressService.settle(settlementSave, this.summary);
    this.displaySave = settlementSave;
    if (!this.summary.debugRun) SaveService.save(settlementSave);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x0b1120);
    const save = this.displaySave;
    const difficulty = DIFFICULTIES[this.summary.difficulty - 1];
    const reasonText = this.summary.reason === 'BASE_DESTROYED'
      ? '防线崩溃'
      : this.summary.reason === 'VOLUNTARY_EXIT'
        ? '主动结束'
        : '测试阶段完成';

    this.add.text(BATTLEFIELD_WIDTH / 2, 120, 'RUN SETTLEMENT', {
      fontFamily: 'monospace', fontSize: '58px', color: '#f8fafc', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(BATTLEFIELD_WIDTH / 2, 195, reasonText, {
      fontFamily: 'monospace', fontSize: '28px', color: '#94a3b8',
    }).setOrigin(0.5);

    if (this.summary.debugRun) {
      this.add.text(BATTLEFIELD_WIDTH / 2, 255, 'DEV PREVIEW · 永久存档未修改', {
        fontFamily: 'monospace', fontSize: '22px', color: '#fbbf24', fontStyle: 'bold',
        backgroundColor: '#451a03aa', padding: { x: 14, y: 7 },
      }).setOrigin(0.5);
    }

    const rows = [
      ['Difficulty', difficulty.label],
      ['Highest Wave', `${this.summary.highestWave}`],
      ['Run Level', `${this.summary.runLevel}`],
      ['Kills', `${this.summary.kills}`],
      ['Boss Kills', `${this.summary.bossKills}`],
      ['Gold', `+${this.rewards.gold}`],
      ['Account EXP', `+${this.rewards.accountXp}`],
      ['Account Level', `${save.accountLevel}${this.rewards.levelsGained > 0 ? `  (+${this.rewards.levelsGained})` : ''}`],
      ['Tech Point', `${save.techPoints}`],
    ];

    rows.forEach(([label, value], index) => {
      const y = 345 + index * 82;
      this.add.text(155, y, label, {
        fontFamily: 'monospace', fontSize: '25px', color: '#94a3b8',
      });
      this.add.text(845, y, value, {
        fontFamily: 'monospace', fontSize: '27px', color: '#f8fafc', fontStyle: 'bold',
      }).setOrigin(1, 0);
    });

    if (this.rewards.difficultyUnlocked !== null) {
      this.add.text(BATTLEFIELD_WIDTH / 2, 1100,
        `NEW DIFFICULTY UNLOCKED · ${DIFFICULTIES[this.rewards.difficultyUnlocked - 1].label}`,
        { fontFamily: 'monospace', fontSize: '26px', color: '#86efac', fontStyle: 'bold' },
      ).setOrigin(0.5);
    } else {
      const highWave = save.highWaveByDifficulty[this.summary.difficulty - 1] ?? 0;
      this.add.text(BATTLEFIELD_WIDTH / 2, 1100,
        `难度 ${difficulty.label} 最高 Wave：${highWave} · 达到 W100 解锁下一难度`,
        { fontFamily: 'monospace', fontSize: '21px', color: '#64748b' },
      ).setOrigin(0.5);
    }

    const xpRequired = getAccountXpToNext(save.accountLevel);
    const accountProgress = xpRequired > 0 ? `${save.accountXp}/${xpRequired}` : 'MAX';
    this.add.text(BATTLEFIELD_WIDTH / 2, 1170,
      `Account Lv ${save.accountLevel} · EXP ${accountProgress} · Gold ${save.gold}`,
      { fontFamily: 'monospace', fontSize: '22px', color: '#cbd5e1' },
    ).setOrigin(0.5);

    this.addButton(500, 1325, 640, 105, '再次开始同难度 · W1', 0x1d4ed8, () => {
      this.scene.start('CombatScene', { difficulty: this.summary.difficulty });
    });
    this.addButton(500, 1450, 640, 90, this.summary.debugRun ? '返回 DEV 主界面' : '返回主界面', 0x334155, () => {
      this.scene.start('MainMenuScene');
    });
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
    this.add.text(x, y, label, {
      fontFamily: 'monospace', fontSize: '28px', color: '#f8fafc', fontStyle: 'bold',
    }).setOrigin(0.5);
    button.on('pointerover', () => button.setAlpha(0.82));
    button.on('pointerout', () => button.setAlpha(1));
    button.on('pointerup', onClick);
  }
}
