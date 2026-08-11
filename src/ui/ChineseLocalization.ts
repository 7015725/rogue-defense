import * as Phaser from 'phaser';

const REPLACEMENTS: readonly [RegExp, string][] = [
  [/纵向 Roguelite Tower Defense/g, '纵向肉鸽塔防'],
  [/\bBOSS SHOP\b/gi, '首领商店'],
  [/\bBOSS GATE\b/gi, '首领关'],
  [/\bREINFORCED\b/gi, '强化波'],
  [/\bLIGHT ARMOR\b/gi, '轻甲'],
  [/\bMEDIUM ARMOR\b/gi, '中甲'],
  [/\bHEAVY ARMOR\b/gi, '重甲'],
  [/\bArmor Penetration\b/gi, '护甲穿透'],
  [/\bArmor Break\b/gi, '破甲'],
  [/\bHard Control\b/gi, '硬控'],
  [/\bHeavy Hit\b/gi, '重击'],
  [/\bSniper Critical\b/gi, '狙击暴击'],
  [/\bAuto Cannon\b/g, '自动炮台'],
  [/\bLMG Nest\b/g, '轻机枪阵地'],
  [/\bTac-Shotgun Bunker\b/g, '战术霰弹堡'],
  [/\bBolt-Action Sniper\b/g, '栓动狙击台'],
  [/\bAuto-GL\b/g, '自动榴弹发射器'],
  [/\bTesla Coil\b/g, '特斯拉线圈'],
  [/\bReload\b/gi, '换弹'],
  [/\bAOE\b/g, '范围伤害'],
  [/\bBurn\b/gi, '燃烧'],
  [/\bSlow\b/gi, '减速'],
  [/\bFreeze\b/gi, '冻结'],
  [/\bStun\b/gi, '眩晕'],
  [/\bCharged\b/gi, '充能'],
  [/\bExplosion\b/gi, '爆炸'],
  [/\bLightning\b/gi, '雷电'],
  [/\bAccount Lv\b/g, '账号等级'],
  [/\bRun Lv\b/g, '局内等级'],
  [/\bTech Point\b/g, '科技点'],
  [/\bEnemy HP\b/g, '敌人生命'],
  [/\bBase HP\b/g, '基地生命'],
  [/\bSecondary AA\b/g, '副武器对空'],
  [/\bMeta DMG\b/g, '局外伤害'],
  [/\bDEV LAUNCH\b/g, '开发测试'],
  [/\bStress 300 ON\b/g, '压力 300 开'],
  [/\bStress 300 OFF\b/g, '压力 300 关'],
  [/\bTouch: speed · E settle\b/g, '触控：速度 · E 结算'],
  [/\bENEMY SPAWN\b/g, '敌人入口'],
  [/\bAIR PATH\b/g, '空中路线'],
  [/\bBASE ATTACK LINE\b/g, '基地攻击线'],
  [/\bDifficulty\b/g, '难度'],
  [/\bEnemies\b/g, '敌人'],
  [/\bHeavy\b/g, '重甲'],
  [/\bAir\b/g, '空中'],
  [/\bCredits\b/g, '战斗币'],
  [/\bReroll\b/g, '重抽'],
  [/\bWeapons\b/g, '武器'],
  [/\bCombos\b/g, '连携'],
  [/\bProjectiles\b/g, '弹体'],
  [/\bSpeed\b/g, '速度'],
  [/\bBudget\b/g, '预算'],
  [/\bDamage\b/g, '伤害'],
  [/\bReward\b/g, '奖励'],
  [/\bRuns\b/g, '局数'],
  [/\bKills\b/g, '击杀'],
  [/\bGold\b/g, '金币'],
  [/\bAmmo\b/g, '弹药'],
  [/\bEXP\b/g, '经验'],
  [/\bPAUSED\b/g, '暂停'],
  [/\bSOLD\b/g, '已售'],
  [/\bLOCKED\b/g, '未解锁'],
  [/\bIDLE\b/g, '待机'],
  [/\bTARGETING\b/g, '索敌'],
  [/\bFIRING\b/g, '开火'],
  [/\bCOOLDOWN\b/g, '冷却'],
  [/\bEMPTY\b/g, '空仓'],
  [/\bRELOADING\b/g, '换弹'],
  [/\bDISABLED\b/g, '停机'],
  [/\bBURN\b/g, '燃烧'],
  [/\bSLOW\b/g, '减速'],
  [/\bFREEZE\b/g, '冻结'],
  [/\bSTUN\b/g, '眩晕'],
  [/\bBREAK\b/g, '破甲'],
  [/\bCHARGED\b/g, '充能'],
  [/\bSMOKE\b/g, '烟幕'],
  [/\bAIR\b/g, '空中'],
  [/\bAA\b/g, '对空'],
  [/\bWPN\b/g, '武器'],
  [/\bPROJ\b/g, '弹体'],
  [/\bBOSS\b/g, '首领'],
  [/\bWAVE\b/g, '波次'],
  [/\bYES\b/g, '是'],
  [/\bNO\b/g, '否'],
  [/\bHP\b/g, '生命'],
];

export function localizePlayerText(input: string): string {
  let value = input;
  for (const [pattern, replacement] of REPLACEMENTS) value = value.replace(pattern, replacement);
  value = value.replace(/\bLv(\d+)\b/g, '$1级');
  value = value.replace(/\bL(\d+)\b/g, '$1级');
  value = value.replace(/\sC\b/g, ' 战斗币');
  return value;
}

function localizeObject(object: Phaser.GameObjects.GameObject): void {
  if (object instanceof Phaser.GameObjects.Text) {
    const localized = localizePlayerText(object.text);
    if (localized !== object.text) object.setText(localized);
    return;
  }

  if (object instanceof Phaser.GameObjects.Container) {
    for (const child of object.list) localizeObject(child);
  }
}

function localizeScene(scene: Phaser.Scene): void {
  for (const child of scene.children.list) localizeObject(child);
}

function attachSceneLocalization(scene: Phaser.Scene): void {
  const apply = (): void => localizeScene(scene);
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, apply);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.events.off(Phaser.Scenes.Events.POST_UPDATE, apply);
  });
  apply();
}

export function installChineseLocalization(game: Phaser.Game): void {
  game.events.once(Phaser.Core.Events.READY, () => {
    for (const scene of game.scene.scenes) {
      scene.events.on(Phaser.Scenes.Events.CREATE, () => attachSceneLocalization(scene));
      if (scene.scene.isActive()) attachSceneLocalization(scene);
    }
  });
}
