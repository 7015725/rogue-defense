import * as Phaser from 'phaser';
import './style.css';
import { BATTLEFIELD_HEIGHT, BATTLEFIELD_WIDTH } from './combat/constants';
import { CombatScene } from './scenes/CombatScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: BATTLEFIELD_WIDTH,
  height: BATTLEFIELD_HEIGHT,
  backgroundColor: '#0f172a',
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [CombatScene],
};

new Phaser.Game(config);
