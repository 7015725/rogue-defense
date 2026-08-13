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
import { getRunTelemetry } from '../run/RunTelemetry';

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
    const telemetry = getRunTelemetry();
    const difficulty = DIFFICULTIES[this.summary.difficulty - 1];
    const reasonText = this.summary.reason === 'BASE_DESTROYED'
      ? '防线崩溃'
      : this.summary.reason === 'VOLUNTARY_EXIT'
        ? '主动结束'
        : '测试阶段完成';

    this.add.text(BATTLEFIELD_WIDTH / 2, 105, '本局结算', {
      fontFamily: 'monospace', fontSize: '58px', color: '#f8fafc', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(BATTLEFIELD_WIDTH / 2, 172, reasonText, {
      fontFamily: 'monospace', fontSize: '28px', color: '#94a3b8',
    }).setOrigin(0.5);

    if (this.summary.debugRun) {
      this.add.text(BATTLEFIELD_WIDTH / 2, 225, 'DEV 预览 · 永久存档未修改', {
        fontFamily: 'monospace', fontSize: '21px', color: '#fbbf24', fontStyle: 'bold',
        backgroundColor: '#451a03aa', padding: { x: 14, y: 7 },
      }).setOrigin(0.5);
    }

    this.add.rectangle(500, 520, 860, 550, 0x111827, 0.76)
      .setStrokeStyle(2, 0x334155, 0.95);
    this.add.text(100, 270, '战斗结果', {
      fontFamily: 'monospace', fontSize: '23px', color: '#cbd5e1', fontStyle: 'bold',
    });

    const battleMetrics: Array<[string, string]> = [
      ['难度', difficulty.label],
      ['最高波次', `${this.summary.highestWave}`],
      ['局内等级', `${this.summary.runLevel}`],
      ['击杀', `${this.summary.kills}`],
      ['Boss 击杀', `${this.summary.bossKills}`],
      ['提前开波', `${telemetry.earlyWaveCount} 次`],
      ['提前收益', `+${telemetry.earlyWaveCredits}`],
      ['协同组合', `${telemetry.comboCount}`],
      ['终局武器', `${telemetry.weaponLoadout.length}/5`],
      ['理论 DPS', telemetry.estimatedDps > 0 ? `≈${Math.round(telemetry.estimatedDps)}` : '—'],
    ];

    battleMetrics.forEach(([label, value], index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      this.addMetricCell(300 + column * 410, 330 + row * 88, 380, 76, label, value);
    });

    this.add.rectangle(500, 925, 860, 190, 0x111827, 0.76)
      .setStrokeStyle(2, 0x334155, 0.95);
    this.add.text(100, 850, '永久成长', {
      fontFamily: 'monospace', fontSize: '23px', color: '#cbd5e1', fontStyle: 'bold',
    });

    const rewardMetrics: Array<[string, string]> = [
      ['金币', `+${this.rewards.gold}`],
      ['账号经验', `+${this.rewards.accountXp}`],
      ['账号等级', `${save.accountLevel}${this.rewards.levelsGained > 0 ? ` (+${this.rewards.levelsGained})` : ''}`],
      ['科技点', `${save.techPoints}`],
    ];
    rewardMetrics.forEach(([label, value], index) => {
      this.addMetricCell(190 + index * 205, 930, 185, 118, label, value);
    });

    this.add.rectangle(500, 1105, 860, 120, 0x111827, 0.68)
      .setStrokeStyle(2, 0x334155, 0.9);
    this.add.text(100, 1060, '终局配置', {
      fontFamily: 'monospace', fontSize: '21px', color: '#94a3b8', fontStyle: 'bold',
    });
    const loadoutText = telemetry.weaponLoadout.length > 0
      ? telemetry.weaponLoadout.join(' · ')
      : '未记录';
    this.add.text(500, 1112, loadoutText, {
      fontFamily: 'monospace', fontSize: '20px', color: '#e2e8f0', align: 'center',
      wordWrap: { width: 780, useAdvancedWrap: true },
    }).setOrigin(0.5);

    if (this.rewards.difficultyUnlocked !== null) {
      this.add.text(BATTLEFIELD_WIDTH / 2, 1205,
        `已解锁新难度 · ${DIFFICULTIES[this.rewards.difficultyUnlocked - 1].label}`,
        { fontFamily: 'monospace', fontSize: '24px', color: '#86efac', fontStyle: 'bold' },
      ).setOrigin(0.5);
    } else {
      const highWave = save.highWaveByDifficulty[this.summary.difficulty - 1] ?? 0;
      this.add.text(BATTLEFIELD_WIDTH / 2, 1205,
        `难度 ${difficulty.label} 最高波次：${highWave} · 达到 W100 解锁下一难度`,
        { fontFamily: 'monospace', fontSize: '20px', color: '#64748b' },
      ).setOrigin(0.5);
    }

    const xpRequired = getAccountXpToNext(save.accountLevel);
    const accountProgress = xpRequired > 0 ? `${save.accountXp}/${xpRequired}` : 'MAX';
    this.add.text(BATTLEFIELD_WIDTH / 2, 1250,
      `账号 Lv ${save.accountLevel} · 经验 ${accountProgress} · 金币 ${save.gold}`,
      { fontFamily: 'monospace', fontSize: '21px', color: '#cbd5e1' },
    ).setOrigin(0.5);

    this.addButton(500, 1360, 640, 100, `再次挑战 · 难度 ${difficulty.label} · W1`, 0x1d4ed8, () => {
      this.scene.start('CombatScene', { difficulty: this.summary.difficulty });
    });
    this.addButton(500, 1475, 640, 86, this.summary.debugRun ? '返回 DEV 主界面' : '返回主界面', 0x334155, () => {
      this.scene.start('MainMenuScene');
    });
  }

  private addMetricCell(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    value: string,
  ): void {
    this.add.rectangle(x, y, width, height, 0x0f172a, 0.9)
      .setStrokeStyle(1, 0x334155, 0.8);
    this.add.text(x - width / 2 + 18, y - 23, label, {
      fontFamily: 'monospace', fontSize: '17px', color: '#94a3b8',
    });
    this.add.text(x + width / 2 - 18, y - 24, value, {
      fontFamily: 'monospace', fontSize: '23px', color: '#f8fafc', fontStyle: 'bold', align: 'right',
    }).setOrigin(1, 0);
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
      fontFamily: 'monospace', fontSize: '27px', color: '#f8fafc', fontStyle: 'bold',
    }).setOrigin(0.5);
    button.on('pointerover', () => button.setAlpha(0.82));
    button.on('pointerout', () => button.setAlpha(1));
    button.on('pointerup', onClick);
  }
}
