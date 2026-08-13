import * as Phaser from 'phaser';
import { recordBossCombat } from '../run/RunTelemetry';

interface BossProbe {
  kind?: string;
  alive?: boolean;
  currentHp: number;
  maxHp: number;
  takeDamage: (amount: number) => void;
}

interface CombatProbe {
  waveManager?: {
    wave: number;
    isBossWave: boolean;
  };
  enemies?: BossProbe[];
  gameSpeed?: number;
  isChoicePaused?: () => boolean;
}

function attachBossCombatTelemetry(scene: Phaser.Scene): void {
  const combat = scene as unknown as CombatProbe;
  const instrumented = new WeakSet<object>();
  let trackedWave = 0;
  let maxHp = 0;
  let remainingHp = 0;
  let damageDealt = 0;
  let fightElapsedMs = 0;

  const publish = (): void => {
    if (trackedWave <= 0 || maxHp <= 0) return;
    recordBossCombat({
      wave: trackedWave,
      maxHp,
      remainingHp,
      damageDealt,
      fightSeconds: fightElapsedMs / 1000,
    });
  };

  const instrumentBoss = (boss: BossProbe): void => {
    if (instrumented.has(boss)) return;
    instrumented.add(boss);
    const originalTakeDamage = boss.takeDamage.bind(boss);
    boss.takeDamage = (amount: number): void => {
      const before = boss.currentHp;
      originalTakeDamage(amount);
      const actual = Math.max(0, before - boss.currentHp);
      damageDealt = Math.min(maxHp, Math.max(damageDealt, maxHp - boss.currentHp) + actual);
      // The max-current value already includes the just-applied hit, so clamp to
      // that authoritative total instead of allowing double counting.
      damageDealt = Math.max(0, Math.min(maxHp, maxHp - boss.currentHp));
      remainingHp = Math.max(0, boss.currentHp);
      publish();
    };
  };

  const observe = (_time: number, delta: number): void => {
    const manager = combat.waveManager;
    if (!manager?.isBossWave) return;
    const boss = combat.enemies?.find((enemy) => enemy.kind === 'boss');
    if (!boss) return;

    if (trackedWave !== manager.wave) {
      trackedWave = manager.wave;
      maxHp = Math.max(1, boss.maxHp);
      remainingHp = Math.max(0, boss.currentHp);
      damageDealt = Math.max(0, maxHp - remainingHp);
      fightElapsedMs = 0;
    }

    instrumentBoss(boss);
    if (!combat.isChoicePaused?.()) {
      const simDelta = Math.min(50, Math.max(0, delta)) * Math.max(1, combat.gameSpeed ?? 1);
      fightElapsedMs += simDelta;
    }
    remainingHp = Math.max(0, boss.currentHp);
    damageDealt = Math.max(damageDealt, Math.max(0, maxHp - remainingHp));
    publish();
  };

  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, observe);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.events.off(Phaser.Scenes.Events.POST_UPDATE, observe);
  });
}

export function installBossCombatTelemetry(game: Phaser.Game): void {
  game.events.once(Phaser.Core.Events.READY, () => {
    const combat = game.scene.getScene('CombatScene');
    combat.events.on(Phaser.Scenes.Events.CREATE, () => {
      combat.time.delayedCall(0, () => attachBossCombatTelemetry(combat));
    });
  });
}
