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
      c('a', 'α 长管精确化', '伤害 +30% · 弹速 +20% · 射速 -10%', {
        damageMultiplier: 1.3, projectileSpeedMultiplier: 1.2, attackSpeedMultiplier: 0.9,
      }),
      c('b', 'β 双联自动炮', '每次同时发射 2 发 · 单发伤害 -42%', {
        multiShot: 2, damageMultiplier: 0.58,
      }),
      c('c', 'γ 快速循环机构', '射速 +55% · 弹匣缩小 25%', {
        attackSpeedMultiplier: 1.55, magazineMultiplier: 0.75,
      }),
    ],
    lv10: {
      a: [
        c('a1', '穿甲弹', 'Armor Penetration +35', { armorPenetrationBonus: 35 }),
        c('a2', '高压发射药', '伤害 +15% · 弹速 +10%', { damageMultiplier: 1.15, projectileSpeedMultiplier: 1.1 }),
        c('a3', '精密火控', '暴击率 +10% · 暴击倍率 +0.35', { critChanceBonus: 0.1, critMultiplierBonus: 0.35 }),
      ],
      b: [
        c('b1', '交替供弹', '攻击速度 +15%', { attackSpeedMultiplier: 1.15 }),
        c('b2', '同步齐射', '双联单发伤害 +12%', { damageMultiplier: 1.12 }),
        c('b3', '分区火控', '双联炮优先攻击两个不同目标', { splitTargets: true }),
      ],
      c: [
        c('c1', '快速换弹', 'Reload 速度 +35%', { reloadSpeedMultiplier: 1.35 }),
        c('c2', '末端高压', '高速循环伤害 +15%', { damageMultiplier: 1.15 }),
        c('c3', '战斗装填', '弹匣 +30% · Reload 速度 +10%', { magazineMultiplier: 1.3, reloadSpeedMultiplier: 1.1 }),
      ],
    },
  },
  lmg: {
    lv5: [
      c('a', 'α 重型枪管', '伤害 +30% · 射速 -10%', {
        damageMultiplier: 1.3, attackSpeedMultiplier: 0.9,
      }),
      c('b', 'β 双联装', '同时攻击 2 个目标 · 单发伤害 -42%', {
        multiShot: 2, splitTargets: true, damageMultiplier: 0.58,
      }),
      c('c', 'γ 弹链供弹', '攻击速度 +50% · 弹匣缩小 25%', {
        attackSpeedMultiplier: 1.5, magazineMultiplier: 0.75,
      }),
    ],
    lv10: {
      a: [
        c('a1', '钨芯弹', 'Armor Penetration +30', { armorPenetrationBonus: 30 }),
        c('a2', '稳定枪架', '持续攻击同一目标时伤害逐发提高，最高 +25%', {
          sameTargetRampPerShot: 0.03, sameTargetRampCap: 0.25,
        }),
        c('a3', '强化膛压', '伤害 +15%', { damageMultiplier: 1.15 }),
      ],
      b: [
        c('b1', '独立火控', '双联射速 +15%', { attackSpeedMultiplier: 1.15 }),
        c('b2', '交叉火力', '暴击率 +8%', { critChanceBonus: 0.08 }),
        c('b3', '强化弹箱', '弹匣容量 +25%', { magazineMultiplier: 1.25 }),
      ],
      c: [
        c('c1', '超大弹箱', '弹匣容量 +50%', { magazineMultiplier: 1.5 }),
        c('c2', '快速换弹', 'Reload 速度 +40%', { reloadSpeedMultiplier: 1.4 }),
        c('c3', '红线射击', '攻击速度 +20% · 伤害 +5%', { attackSpeedMultiplier: 1.2, damageMultiplier: 1.05 }),
      ],
    },
  },
  sniper: {
    lv5: [
      c('a', 'α 反器材化', '伤害 +75% · 射速 -25% · Armor Penetration +35', {
        damageMultiplier: 1.75, attackSpeedMultiplier: 0.75, armorPenetrationBonus: 35,
      }),
      c('b', 'β 精密亚音速', '暴击率 +15% · 暴击倍率 +0.4', {
        critChanceBonus: 0.15, critMultiplierBonus: 0.4,
      }),
      c('c', 'γ 半自动射手', '攻击速度 +100% · 单发伤害 -38%', {
        attackSpeedMultiplier: 2, damageMultiplier: 0.62,
      }),
    ],
    lv10: {
      a: [
        c('a1', '重型穿甲弹', 'Armor Penetration +50', { armorPenetrationBonus: 50 }),
        c('a2', '反器材爆破芯', '伤害 +18%', { damageMultiplier: 1.18 }),
        c('a3', '弱点测距', '暴击率 +10% · 暴击倍率 +0.3', { critChanceBonus: 0.1, critMultiplierBonus: 0.3 }),
      ],
      b: [
        c('b1', '首发处决', '暴击率 +10%', { critChanceBonus: 0.1 }),
        c('b2', '弱点识别', '暴击倍率 +0.5', { critMultiplierBonus: 0.5 }),
        c('b3', '冷枪', '伤害 +12% · 攻速 +8%', { damageMultiplier: 1.12, attackSpeedMultiplier: 1.08 }),
      ],
      c: [
        c('c1', '快速复位', '攻击速度 +15%', { attackSpeedMultiplier: 1.15 }),
        c('c2', '双击', '每次攻击发射 2 发 · 单发伤害再降低', { multiShot: 2, damageMultiplier: 0.58 }),
        c('c3', '标记射击', '暴击率 +10%', { critChanceBonus: 0.1 }),
      ],
    },
  },
  'auto-gl': {
    lv5: [
      c('a', 'α 温压弹', '爆炸半径 +35% · 伤害 +10% · Slow 30% / 4s', {
        aoeRadiusMultiplier: 1.35, damageMultiplier: 1.1,
      }),
      c('b', 'β 弹跳榴弹', '每发产生 2 次连续爆炸 · 单次伤害降低 · 范围略缩小', {
        grenadeBursts: 2, damageMultiplier: 0.58, aoeRadiusMultiplier: 0.85,
      }),
      c('c', 'γ 烟幕协议', '低伤大范围压制 · 敌人攻击速度 -40% / 6s', {
        damageMultiplier: 0.55, aoeRadiusMultiplier: 1.3, attackSpeedMultiplier: 1.15,
      }),
    ],
    lv10: {
      a: [
        c('a1', '冲击波', '爆炸附带 350ms Stun', { stunMsBonus: 350 }),
        c('a2', '真空效应', '爆炸半径再 +15%', { aoeRadiusMultiplier: 1.15 }),
        c('a3', '高压起爆', '伤害 +15%', { damageMultiplier: 1.15 }),
      ],
      b: [
        c('b1', '高弹性', '额外 +1 次弹跳爆炸 · 单次伤害 -15%', { grenadeBursts: 1, damageMultiplier: 0.85 }),
        c('b2', '群落弹跳', '爆炸半径 +15%', { aoeRadiusMultiplier: 1.15 }),
        c('b3', '终端爆炸', '伤害 +15%', { damageMultiplier: 1.15 }),
      ],
      c: [
        c('c1', '高密度烟幕', '范围 +15%', { aoeRadiusMultiplier: 1.15 }),
        c('c2', '阻滞剂', '压制伤害 +20%', { damageMultiplier: 1.2 }),
        c('c3', '战术封锁', '攻击速度 +15%', { attackSpeedMultiplier: 1.15 }),
      ],
    },
  },
  tesla: {
    lv5: [
      c('a', 'α 高压电网', '伤害 +50% · Stun +400ms · 连锁距离 +10%', {
        damageMultiplier: 1.5, stunMsBonus: 400, chainRangeMultiplier: 1.1,
      }),
      c('b', 'β 分流电弧', '额外连锁 2 个目标 · 单次伤害 -20% · 连锁距离 +10%', {
        chainCountBonus: 2, damageMultiplier: 0.8, chainRangeMultiplier: 1.1,
      }),
      c('c', 'γ 超导线圈', '攻击速度 +80% · 单次伤害 -32% · 开启暴击构筑', {
        attackSpeedMultiplier: 1.8, damageMultiplier: 0.68, critChanceBonus: 0.1, critMultiplierBonus: 1,
      }),
    ],
    lv10: {
      a: [
        c('a1', '高压脉冲', '额外连锁 +1', { chainCountBonus: 1 }),
        c('a2', '神经干扰', 'Stun 再 +250ms', { stunMsBonus: 250 }),
        c('a3', '残余电荷', '伤害 +15%', { damageMultiplier: 1.15 }),
      ],
      b: [
        c('b1', '扩展电网', '连锁距离 +20%', { chainRangeMultiplier: 1.2 }),
        c('b2', '脉冲震击', '攻击速度 +15%', { attackSpeedMultiplier: 1.15 }),
        c('b3', '残余电场', 'Stun +200ms', { stunMsBonus: 200 }),
      ],
      c: [
        c('c1', '高速振荡', '攻击速度 +15%', { attackSpeedMultiplier: 1.15 }),
        c('c2', '暴击放电', '暴击率 +10%', { critChanceBonus: 0.1 }),
        c('c3', '电荷积累', '额外连锁 +1 · 连锁距离 +15%', { chainCountBonus: 1, chainRangeMultiplier: 1.15 }),
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
