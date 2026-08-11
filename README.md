# Rogue Defense

单机纵向 Roguelite 塔防项目。敌人从屏幕顶部向下推进，基地与最多 5 套独立武器系统位于底部自动防守；玩家通过局内构筑、Boss 商店与局外科技持续推进无尽 Wave。

## 当前阶段

**M0.2 — Run Progression + First Roguelite Choice**

当前原型在 M0.1 基础上新增：

- 击杀自动获得 Run EXP / Credits；
- Run Level 与连续 Pending Upgrade；
- Level Up 时战斗完全暂停；
- 三选一升级界面；
- 跳过升级换取 Credits；
- 全局伤害 +10%；
- 全局攻速 +8%；
- Base Max HP +12%；
- Auto Cannon +1 Lv；
- 第一把随机副武器 LMG Nest；
- Auto Cannon / LMG 独立索敌、弹匣、Reload 与攻击计时；
- Run Lv4 前后 LMG 首次展示保护。

M0.1 的纵向战场、30 秒 Wave、残怪堆积、ProjectilePool、Boss Gate、1×～4×速度全部保留。

## 技术栈

- Phaser 4
- TypeScript
- Vite

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

升级界面使用鼠标或触摸点击卡牌。

## 文档

- [设计文档索引](docs/README.md)
- [M0.2 设计](docs/m0.2-design.md)
- [M0.2 验证清单](docs/m0.2-validation.md)
- [V0.2 游戏系统设计总稿](docs/game-design-v0.2.md)
- [V0.1 升级卡池 V1](docs/upgrade-card-pool-v0.1.md)
- [Upgrade Director V1](docs/upgrade-director-v1.md)
- [Decision Log](docs/decision-log.md)

## 里程碑

```text
M0.1  基础战斗                  ✓
M0.2  Run EXP + 三选一 + LMG    ← 当前
M0.3  5 种随机武器
M0.4  Lv5 / Lv10 武器路线
M0.5  Armor + 重甲
M0.6  Air + 防空
M0.7  Status + Combo
M0.8  Boss Shop
M0.9  结算 + 科技树 + Save
V0.1  完整 Web 可玩版
       ↓
Android APK
```
