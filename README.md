# Rogue Defense

单机纵向 Roguelite 塔防项目。敌人从屏幕顶部向下推进，基地与最多 5 套独立武器系统位于底部自动防守；玩家通过局内构筑、Boss 商店与局外科技持续推进无尽 Wave。

## 当前阶段

**M0.1 — 纵向防线可玩原型**

当前原型验证：

- 1000×1600 逻辑战场；
- 敌人从顶部生成并向底部基地推进；
- Slot 1 基础自动炮自动索敌、旋转、射击、换弹；
- Projectile 对象池；
- 独立 DamageSystem 与 Armor 公式；
- 30 秒固定 Wave，残怪不会在换 Wave 时消失；
- Wave 10 Boss Gate；
- 1× / 2× / 3× / 4× 模拟速度；
- Base Destroyed / M0.1 Test Complete 状态。

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

## 文档

- [设计文档索引](docs/README.md)
- [V0.2 游戏系统设计总稿](docs/game-design-v0.2.md)
- [V0.1 升级卡池 V1](docs/upgrade-card-pool-v0.1.md)
- [Upgrade Director V1](docs/upgrade-director-v1.md)
- [Decision Log](docs/decision-log.md)

## 里程碑

```text
M0.1  基础战斗
M0.2  Run EXP + 三选一 + LMG
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
