import {
  RANDOM_WEAPON_DEFINITIONS,
  RANDOM_WEAPON_IDS,
  WEAPON_LEVEL_CAP,
  type RandomWeaponId,
} from '../combat/constants';
import type { ComboId } from '../combat/types';

export type ShopItemKind =
  | 'heal-base'
  | 'repair-weapon'
  | 'global-damage'
  | 'global-attack-speed'
  | 'base-max-hp'
  | 'weapon-level'
  | 'new-weapon'
  | 'combo'
  | 'reroll-charge';

export interface ShopWeaponSnapshot {
  id: string;
  name: string;
  level: number;
  currentHp: number;
  maxHp: number;
}

export interface BossShopContext {
  wave: number;
  baseCurrentHp: number;
  baseMaxHp: number;
  weapons: readonly ShopWeaponSnapshot[];
  ownedRandomWeaponIds: readonly RandomWeaponId[];
  activeComboIds: readonly ComboId[];
  globalDamageLevel: number;
  globalAttackSpeedLevel: number;
  baseHpUpgradeLevel: number;
}

export interface BossShopItem {
  id: string;
  kind: ShopItemKind;
  title: string;
  description: string;
  cost: number;
  rarity: 'COMMON' | 'RARE' | 'EPIC';
  weaponId?: string;
  comboId?: ComboId;
}

const COMBO_LABELS: Record<ComboId, { title: string; description: string }> = {
  DETONATION: { title: '爆燃协议', description: '需要燃烧来源 + Auto-GL：爆炸命中燃烧目标后引爆部分剩余燃烧' },
  CONCUSSIVE_BREAK: { title: '震荡破甲', description: 'Tesla + Sniper：眩晕时被 Sniper 命中\n护甲 -35，持续 4 秒' },
  OVERLOAD: { title: '电力过载', description: 'Tesla：充能目标再次被电击\n额外 35% 伤害，并溅射最近敌人' },
  CONTROL_EXECUTION: { title: '控制处决', description: 'Tesla + Sniper：眩晕时 Sniper 暴击\n追加本次最终伤害的 75%' },
};

export class BossShopDirector {
  generate(context: BossShopContext): BossShopItem[] {
    const logistics = this.buildLogistics(context);
    const pool = this.buildPool(context).filter((item) => item.id !== logistics.id);
    const selected: BossShopItem[] = [logistics];

    while (selected.length < 5 && pool.length > 0) {
      const index = Math.floor(Math.random() * pool.length);
      selected.push(pool.splice(index, 1)[0]);
    }

    return selected;
  }

  getRefreshCost(refreshCount: number): number {
    return 60 * Math.pow(2, Math.max(0, Math.floor(refreshCount)));
  }

  getReplacementLevel(wave: number): number {
    return Math.min(8, Math.max(1, Math.ceil(Math.max(1, wave) / 10) * 2));
  }

  private buildLogistics(context: BossShopContext): BossShopItem {
    const damagedWeapons = context.weapons
      .filter((weapon) => weapon.currentHp < weapon.maxHp)
      .sort((a, b) => (b.maxHp - b.currentHp) - (a.maxHp - a.currentHp));

    if (damagedWeapons.length > 0 && (context.baseCurrentHp >= context.baseMaxHp || Math.random() < 0.5)) {
      const weapon = damagedWeapons[0];
      return {
        id: `repair:${weapon.id}`,
        kind: 'repair-weapon',
        title: `维修 · ${weapon.name}`,
        description: '立即恢复该武器至满耐久',
        cost: this.price(60, context.wave),
        rarity: 'COMMON',
        weaponId: weapon.id,
      };
    }

    return {
      id: 'heal-base',
      kind: 'heal-base',
      title: '基地应急修复',
      description: '恢复 Base 最大生命的 25%',
      cost: this.price(80, context.wave),
      rarity: 'COMMON',
    };
  }

  private buildPool(context: BossShopContext): BossShopItem[] {
    const items: BossShopItem[] = [];

    if (context.globalDamageLevel < 10) {
      items.push({ id: 'shop:global-damage', kind: 'global-damage', title: '强化弹药', description: '所有武器伤害 +10%', cost: this.price(100, context.wave), rarity: 'COMMON' });
    }
    if (context.globalAttackSpeedLevel < 10) {
      items.push({ id: 'shop:global-attack-speed', kind: 'global-attack-speed', title: '快速循环', description: '所有武器攻击速度 +8%', cost: this.price(110, context.wave), rarity: 'COMMON' });
    }
    if (context.baseHpUpgradeLevel < 10) {
      items.push({ id: 'shop:base-max-hp', kind: 'base-max-hp', title: '加固基地', description: 'Base MaxHP +12%，并增加等量当前 HP', cost: this.price(120, context.wave), rarity: 'COMMON' });
    }

    for (const weapon of context.weapons) {
      if (weapon.level >= WEAPON_LEVEL_CAP) continue;
      items.push({
        id: `shop:weapon-level:${weapon.id}`,
        kind: 'weapon-level',
        title: `${weapon.name} +1 Lv`,
        description: `Lv${weapon.level} → Lv${weapon.level + 1}`,
        cost: this.price(160, context.wave),
        rarity: 'RARE',
        weaponId: weapon.id,
      });
    }

    const owned = new Set<RandomWeaponId>(context.ownedRandomWeaponIds);
    for (const weaponId of RANDOM_WEAPON_IDS.filter((id) => !owned.has(id))) {
      const full = context.ownedRandomWeaponIds.length >= 4;
      items.push({
        id: `shop:new-weapon:${weaponId}`,
        kind: 'new-weapon',
        title: `${full ? '替换武器' : '新武器'} · ${RANDOM_WEAPON_DEFINITIONS[weaponId].name}`,
        description: full ? '武器槽已满 · 购买后选择一把随机武器替换' : '立即部署到一个空武器槽',
        cost: this.price(220, context.wave),
        rarity: 'RARE',
        weaponId,
      });
    }

    for (const comboId of this.getEligibleCombos(context)) {
      const label = COMBO_LABELS[comboId];
      items.push({
        id: `shop:combo:${comboId}`,
        kind: 'combo',
        title: label.title,
        description: label.description,
        cost: this.price(220, context.wave),
        rarity: 'EPIC',
        comboId,
      });
    }

    items.push({
      id: 'shop:reroll-charge',
      kind: 'reroll-charge',
      title: '重抽许可',
      description: '获得 1 次 Level Up 三选一重抽',
      cost: this.price(70, context.wave),
      rarity: 'RARE',
    });

    return items;
  }

  private getEligibleCombos(context: BossShopContext): ComboId[] {
    const active = new Set(context.activeComboIds);
    const weapons = new Set(context.weapons.map((weapon) => weapon.id));
    const result: ComboId[] = [];

    if (!active.has('CONCUSSIVE_BREAK') && weapons.has('tesla') && weapons.has('sniper')) result.push('CONCUSSIVE_BREAK');
    if (!active.has('OVERLOAD') && weapons.has('tesla')) result.push('OVERLOAD');
    if (!active.has('CONTROL_EXECUTION') && weapons.has('tesla') && weapons.has('sniper')) result.push('CONTROL_EXECUTION');
    return result;
  }

  private price(base: number, wave: number): number {
    const checkpoint = Math.max(1, Math.ceil(wave / 10));
    const multiplier = 1 + (checkpoint - 1) * 0.15;
    return Math.round((base * multiplier) / 5) * 5;
  }
}
