# Rogue Defense

单机纵向 Roguelite 塔防项目。敌人从屏幕顶部向下推进，基地与最多 5 套独立武器系统位于底部自动防守；玩家通过局内构筑、Boss 商店与局外科技持续推进无尽 Wave。

## 当前阶段

**M0.4 — Weapon Lv1–10 + Lv5/Lv10 Routes**

当前原型已经具备：

- 1000×1600 纵向战场；
- 敌人从顶部向下推进；
- 30 秒固定 Wave 与残怪堆积；
- Wave 10 Boss Gate；
- Run EXP / Run Level / Credits；
- Level Up 完全暂停；
- 三选一与 Skip → Credits；
- Slot 1 固定 Auto Cannon + 4 个随机武器槽；
- 五种随机武器池：LMG、Shotgun、Sniper、Auto-GL、Tesla；
- 所有 6 把武器可独立 Lv1～10；
- Lv5 自动触发 α / β / γ 免费路线选择；
- Lv10 自动触发当前路线内 3 选 1 专精；
- 路线选择期间战斗完全暂停且不消耗额外升级次数；
- BranchEffect 可改变 Damage / AttackSpeed / Range / Magazine / Reload / Crit / ArmorPen / WeaponMode / AOE / Chain / MultiShot 等；
- Shotgun 独头弹可切换攻击模式；
- Auto-GL 弹跳榴弹可连续爆炸；
- Tesla 地面放电可切换为径向 AOE；
- 1× / 2× / 3× / 4× 模拟速度。

复杂 Burn、Smoke Debuff、正式 Stun Resistance 等统一状态逻辑仍保留到 M0.7。

## 技术栈

- Phaser 4
- TypeScript
- Vite

Web-first，玩法稳定后使用同一套代码封装 Android APK。

## 本地运行

要求 Node.js `20.19+` 或 `22.12+`。

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```

## 控制

- `1`：1×
- `2`：2×
- `3`：3×
- `4`：4×
- `R`：重新开始

升级与武器路线界面使用鼠标或触摸点击卡牌。

## 文档

- [设计文档索引](docs/README.md)
- [M0.4 设计](docs/m0.4-design.md)
- [M0.4 验证清单](docs/m0.4-validation.md)
- [V0.2 游戏系统设计总稿](docs/game-design-v0.2.md)
- [V0.1 升级卡池 V1](docs/upgrade-card-pool-v0.1.md)
- [Upgrade Director V1](docs/upgrade-director-v1.md)
- [Decision Log](docs/decision-log.md)

## 里程碑

```text
M0.1  基础战斗                     ✓
M0.2  Run EXP + 三选一 + LMG       ✓
M0.3  5 种随机武器                 ✓
M0.4  Lv1～10 + Lv5/Lv10 路线      ← 当前
M0.5  Armor + 重甲
M0.6  Air + 防空
M0.7  Status + Combo
M0.8  Boss Shop
M0.9  结算 + 科技树 + Save
V0.1  完整 Web 可玩版
       ↓
Android APK
```
