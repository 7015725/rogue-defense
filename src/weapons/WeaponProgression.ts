import type { TargetingRule, WeaponMode } from '../combat/types';

export type WeaponBranchStage = 5 | 10;

export interface WeaponBranchEffect {
  damageMultiplier?: number;
  attackSpeedMultiplier?: number;
  rangeMultiplier?: number;
  projectileSpeedMultiplier?: number;
  projectileSpeedOverride?: number;
  magazineMultiplier?: number;
  reloadSpeedMultiplier?: number;
  critChanceBonus?: number;
  critMultiplierBonus?: number;
  armorPenetrationBonus?: number;
  modeOverride?: WeaponMode;
  targetingRuleOverride?: TargetingRule;
  coneAngleMultiplier?: number;
  pelletCountMultiplier?: number;
  aoeRadiusMultiplier?: number;
  impactDelayMultiplier?: number;
  chainCountBonus?: number;
  chainRangeMultiplier?: number;
  stunMsBonus?: number;
  multiShot?: number;
  splitTargets?: boolean;
  grenadeBursts?: number;
  sameTargetRampPerShot?: number;
  sameTargetRampCap?: number;
}

export interface WeaponBranchChoice {
  id: string;
  title: string;
  description: string;
  effect: WeaponBranchEffect;
}

export interface WeaponProgressionDefinition {
  lv5: readonly WeaponBranchChoice[];
  lv10: Readonly<Record<string, readonly WeaponBranchChoice[]>>;
}

const c = (
  id: string,
  title: string,
  description: string,
  effect: WeaponBranchEffect,
): WeaponBranchChoice => ({ id, title, description, effect });

export const WEAPON_PROGRESSION: Readonly<Record<string, WeaponProgressionDefinition>> = {
  'auto-cannon': {
    lv5: [
      c('a', 'α 长管精确化', '射程 +50% · 伤害 +40% · 弹速提高 · 射速 -25%', {
        rangeMultiplier: 1.5, damageMultiplier: 1.4, projectileSpeedMultiplier: 1.25, attackSpeedMultiplier: 0.75,
      }),
      c('b', 'β 双联自动炮', '每次同时发射 2 发 · 单发伤害降低', {
        multiShot: 2, damageMultiplier: 0.62,
      }),
      c('c', 'γ 快速循环机构', '射速 +120% · 弹匣缩小 40%', {
        attackSpeedMultiplier: 2.2, magazineMultiplier: 0.6,
      }),
    ],
    lv10: {
      a: [
        c('a1', '穿甲弹', '额外获得 50 点 Armor Penetration', { armorPenetrationBonus: 50 }),
        c('a2', '高压发射药', '伤害 +25% · 弹速 +15%', { damageMultiplier: 1.25, projectileSpeedMultiplier: 1.15 }),
        c('a3', '精密火控', '暴击率 +15% · 暴击倍率 +0.5', { critChanceBonus: 0.15, critMultiplierBonus: 0.5 }),
      ],
      b: [
        c('b1', '交替供弹', '攻击速度 +25%', { attackSpeedMultiplier: 1.25 }),
        c('b2', '同步齐射', '双联单发伤害 +20%', { damageMultiplier: 1.2 }),
        c('b3', '分区火控', '双联炮优先攻击两个不同目标', { splitTargets: true }),
      ],
      c: [
        c('c1', '快速换弹', 'Reload 速度 +60%', { reloadSpeedMultiplier: 1.6 }),
        c('c2', '末端高压', '高速循环伤害 +25%', { damageMultiplier: 1.25 }),
        c('c3', '战斗装填', '弹匣 +50% · Reload 速度 +15%', { magazineMultiplier: 1.5, reloadSpeedMultiplier: 1.15 }),
      ],
    },
  },
  lmg: {
    lv5: [
      c('a', 'α 重型枪管', '射程 +50% · 伤害 +40% · 射速 -25%', {
        rangeMultiplier: 1.5, damageMultiplier: 1.4, attackSpeedMultiplier: 0.75,
      }),
      c('b', 'β 双联装', '同时攻击 2 个目标 · 单发伤害降低', {
        multiShot: 2, splitTargets: true, damageMultiplier: 0.55,
      }),
      c('c', 'γ 弹链供弹', '攻击速度 +120%', { attackSpeedMultiplier: 2.2 }),
    ],
    lv10: {
      a: [
        c('a1', '钨芯弹', 'Armor Penetration +40', { armorPenetrationBonus: 40 }),
        c('a2', '稳定枪架', '持续攻击同一目标时，伤害逐发提高，最高 +40%', {
          sameTargetRampPerShot: 0.04, sameTargetRampCap: 0.4,
        }),
        c('a3', '强化膛压', '伤害 +20%', { damageMultiplier: 1.2 }),
      ],
      b: [
        c('b1', '独立火控', '双联射速 +20%', { attackSpeedMultiplier: 1.2 }),
        c('b2', '交叉火力', '暴击率 +10%', { critChanceBonus: 0.1 }),
        c('b3', '弹幕覆盖', '射程 +20%', { rangeMultiplier: 1.2 }),
      ],
      c: [
        c('c1', '超大弹箱', '弹匣容量 ×2', { magazineMultiplier: 2 }),
        c('c2', '快速换弹', 'Reload 速度 +70%', { reloadSpeedMultiplier: 1.7 }),
        c('c3', '红线射击', '攻击速度再 +35% · 伤害 +10%', { attackSpeedMultiplier: 1.35, damageMultiplier: 1.1 }),
      ],
    },
  },
  shotgun: {
    lv5: [
      c('a', 'α 龙息弹', '命中附加 Burn 5s · 最多 3 层 · 刷新持续时间', {
        damageMultiplier: 1.2, coneAngleMultiplier: 1.1,
      }),
      c('b', 'β 独头弹', '改为高伤单发弹体 · 射程提高 · 获得穿甲', {
        modeOverride: 'projectile', projectileSpeedOverride: 1500, damageMultiplier: 18, rangeMultiplier: 1.7,
        attackSpeedMultiplier: 0.85, armorPenetrationBonus: 30,
      }),
      c('c', 'γ 全自动战斗霰弹', '射速大幅提高 · 24 发弹匣 · 单次伤害降低', {
        attackSpeedMultiplier: 3.5, magazineMultiplier: 3, damageMultiplier: 0.5, coneAngleMultiplier: 0.9,
      }),
    ],
    lv10: {
      a: [
        c('a1', '高温燃烧弹', '伤害 +30%', { damageMultiplier: 1.3 }),
        c('a2', '火焰扩散', '锥形角度 +30%', { coneAngleMultiplier: 1.3 }),
        c('a3', '爆燃弹药', '弹丸数量 +35%', { pelletCountMultiplier: 1.35 }),
      ],
      b: [
        c('b1', '钨芯独头弹', 'Armor Penetration +50', { armorPenetrationBonus: 50 }),
        c('b2', '震荡弹头', '伤害 +25%', { damageMultiplier: 1.25 }),
        c('b3', '猎杀弹', '暴击率 +20% · 暴击倍率 +0.5', { critChanceBonus: 0.2, critMultiplierBonus: 0.5 }),
      ],
      c: [
        c('c1', '鼓式弹匣', '弹匣容量 ×2', { magazineMultiplier: 2 }),
        c('c2', '快速循环', '攻击速度 +25%', { attackSpeedMultiplier: 1.25 }),
        c('c3', '扫射散布', '锥形角度 +20% · 弹丸数量 +20%', { coneAngleMultiplier: 1.2, pelletCountMultiplier: 1.2 }),
      ],
    },
  },
  sniper: {
    lv5: [
      c('a', 'α 反器材化', '伤害 ×2.5 · 射速 -30% · 穿甲提高', {
        damageMultiplier: 2.5, attackSpeedMultiplier: 0.7, armorPenetrationBonus: 40,
      }),
      c('b', 'β 精密亚音速', '暴击率 +35% · 暴击倍率 +1.0', {
        critChanceBonus: 0.35, critMultiplierBonus: 1,
      }),
      c('c', 'γ 半自动射手', '攻击速度 +250% · 单发伤害 -50%', {
        attackSpeedMultiplier: 3.5, damageMultiplier: 0.5,
      }),
    ],
    lv10: {
      a: [
        c('a1', '重型穿甲弹', 'Armor Penetration +70', { armorPenetrationBonus: 70 }),
        c('a2', '反器材爆破芯', '伤害 +30%', { damageMultiplier: 1.3 }),
        c('a3', '弱点测距', '暴击率 +15% · 暴击倍率 +0.5', { critChanceBonus: 0.15, critMultiplierBonus: 0.5 }),
      ],
      b: [
        c('b1', '首发处决', '暴击率 +20%', { critChanceBonus: 0.2 }),
        c('b2', '弱点识别', '暴击倍率 +1.0', { critMultiplierBonus: 1 }),
        c('b3', '冷枪', '伤害 +20% · 攻速 +10%', { damageMultiplier: 1.2, attackSpeedMultiplier: 1.1 }),
      ],
      c: [
        c('c1', '快速复位', '攻击速度 +25%', { attackSpeedMultiplier: 1.25 }),
        c('c2', '双击', '每次攻击额外发射 1 发，单发伤害调整', { multiShot: 2, damageMultiplier: 0.65 }),
        c('c3', '标记射击', '暴击率 +20%', { critChanceBonus: 0.2 }),
      ],
    },
  },
  'auto-gl': {
    lv5: [
      c('a', 'α 温压弹', '爆炸半径 +60% · 伤害 +15% · Slow 30% / 4s', { aoeRadiusMultiplier: 1.6, damageMultiplier: 1.15 }),
      c('b', 'β 弹跳榴弹', '每发产生 3 次连续爆炸，范围略缩小', { grenadeBursts: 3, aoeRadiusMultiplier: 0.8 }),
      c('c', 'γ 烟幕协议', '低伤大范围压制 · 敌人攻击速度 -40% / 6s', {
        damageMultiplier: 0.35, aoeRadiusMultiplier: 1.45, attackSpeedMultiplier: 1.2,
      }),
    ],
    lv10: {
      a: [
        c('a1', '冲击波', '爆炸附带 500ms Stun', { stunMsBonus: 500 }),
        c('a2', '真空效应', '爆炸半径再 +25%', { aoeRadiusMultiplier: 1.25 }),
        c('a3', '高压起爆', '伤害 +25%', { damageMultiplier: 1.25 }),
      ],
      b: [
        c('b1', '高弹性', '额外 +2 次弹跳爆炸', { grenadeBursts: 2 }),
        c('b2', '群落弹跳', '爆炸半径 +20%', { aoeRadiusMultiplier: 1.2 }),
        c('b3', '终端爆炸', '伤害 +30%', { damageMultiplier: 1.3 }),
      ],
      c: [
        c('c1', '高密度烟幕', '范围 +25%', { aoeRadiusMultiplier: 1.25 }),
        c('c2', '阻滞剂', '压制伤害 +40%', { damageMultiplier: 1.4 }),
        c('c3', '战术封锁', '攻击速度 +30%', { attackSpeedMultiplier: 1.3 }),
      ],
    },
  },
  tesla: {
    lv5: [
      c('a', 'α 高压电网', '伤害 +150% · Stun 提高到约 1s · 射程增加', {
        damageMultiplier: 2.5, stunMsBonus: 700, rangeMultiplier: 1.15,
      }),
      c('b', 'β 地面放电', '取消链式目标，改为自身周围径向 AOE', {
        modeOverride: 'tesla-radial', damageMultiplier: 1.3, rangeMultiplier: 1.1,
      }),
      c('c', 'γ 超导线圈', '攻击速度 +200% · 开启暴击构筑', {
        attackSpeedMultiplier: 3, damageMultiplier: 0.6, critChanceBonus: 0.15, critMultiplierBonus: 1.5,
      }),
    ],
    lv10: {
      a: [
        c('a1', '高压脉冲', '额外连锁 +1', { chainCountBonus: 1 }),
        c('a2', '神经干扰', 'Stun 再 +500ms', { stunMsBonus: 500 }),
        c('a3', '残余电荷', '伤害 +25%', { damageMultiplier: 1.25 }),
      ],
      b: [
        c('b1', '扩展接地', '径向范围 +25%', { rangeMultiplier: 1.25 }),
        c('b2', '脉冲震击', '攻击速度 +25%', { attackSpeedMultiplier: 1.25 }),
        c('b3', '残余电场', 'Stun +300ms', { stunMsBonus: 300 }),
      ],
      c: [
        c('c1', '高速振荡', '攻击速度 +25%', { attackSpeedMultiplier: 1.25 }),
        c('c2', '暴击放电', '暴击率 +15%', { critChanceBonus: 0.15 }),
        c('c3', '电荷积累', '额外连锁 +1 · 连锁距离 +20%', { chainCountBonus: 1, chainRangeMultiplier: 1.2 }),
      ],
    },
  },
};

export function getWeaponProgression(weaponId: string): WeaponProgressionDefinition {
  const progression = WEAPON_PROGRESSION[weaponId];
  if (!progression) throw new Error(`Missing weapon progression for ${weaponId}`);
  return progression;
}

export function combineBranchEffects(
  ...effects: readonly (WeaponBranchEffect | null | undefined)[]
): WeaponBranchEffect {
  const result: WeaponBranchEffect = {};
  const multiplyKeys: readonly (keyof WeaponBranchEffect)[] = [
    'damageMultiplier', 'attackSpeedMultiplier', 'rangeMultiplier', 'projectileSpeedMultiplier',
    'magazineMultiplier', 'reloadSpeedMultiplier', 'coneAngleMultiplier', 'pelletCountMultiplier',
    'aoeRadiusMultiplier', 'impactDelayMultiplier', 'chainRangeMultiplier',
  ];
  const additiveKeys: readonly (keyof WeaponBranchEffect)[] = [
    'critChanceBonus', 'critMultiplierBonus', 'armorPenetrationBonus', 'chainCountBonus', 'stunMsBonus',
    'grenadeBursts',
  ];

  for (const effect of effects) {
    if (!effect) continue;

    for (const key of multiplyKeys) {
      const value = effect[key];
      if (typeof value === 'number') {
        const previous = result[key];
        (result as Record<string, unknown>)[key] = (typeof previous === 'number' ? previous : 1) * value;
      }
    }

    for (const key of additiveKeys) {
      const value = effect[key];
      if (typeof value === 'number') {
        const previous = result[key];
        (result as Record<string, unknown>)[key] = (typeof previous === 'number' ? previous : 0) + value;
      }
    }

    if (effect.projectileSpeedOverride !== undefined) result.projectileSpeedOverride = effect.projectileSpeedOverride;
    if (effect.modeOverride !== undefined) result.modeOverride = effect.modeOverride;
    if (effect.targetingRuleOverride !== undefined) result.targetingRuleOverride = effect.targetingRuleOverride;
    if (effect.multiShot !== undefined) result.multiShot = Math.max(result.multiShot ?? 1, effect.multiShot);
    if (effect.splitTargets !== undefined) result.splitTargets = effect.splitTargets;
    if (effect.sameTargetRampPerShot !== undefined) result.sameTargetRampPerShot = effect.sameTargetRampPerShot;
    if (effect.sameTargetRampCap !== undefined) result.sameTargetRampCap = effect.sameTargetRampCap;
  }

  return result;
}
