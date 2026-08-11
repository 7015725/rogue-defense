# Rogue Defense

单机纵向 Roguelite 塔防项目。敌人从屏幕顶部向下推进，基地与最多 5 套独立武器系统位于底部自动防守；玩家通过局内构筑、Boss 商店与局外科技持续推进无尽 Wave。

## 当前阶段

**M0.3 — Five-Weapon Random Pool**

当前原型已经具备：

- 1000×1600 纵向战场；
- 敌人从顶部向下推进；
- 30 秒固定 Wave 与残怪堆积；
- Wave 10 Boss Gate；
- Run EXP / Run Level / Credits；
- Level Up 完全暂停；
- 三选一与 Skip → Credits；
- 全局伤害、攻速、Base Max HP、Auto Cannon Level；
- Slot 1 固定 Auto Cannon；
- 4 个随机武器槽；
- 五种随机武器池：LMG、Shotgun、Sniper、Auto-GL、Tesla；
- 第一把随机副武器展示保护；
- Projectile / Shotgun Cone / Grenade AOE / Tesla Chain 四种基础攻击模式；
- Frontmost / Highest HP 两种索敌规则；
- Tesla 轻量 Stun（正式 StatusSystem 留到 M0.7）；
- 1× / 2× / 3× / 4× 模拟速度。

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

升级界面使用鼠标或触摸点击卡牌。

## 文档

- [设计文档索引](docs/README.md)
- [M0.3 设计](docs/m0.3-design.md)
- [M0.3 验证清单](docs/m0.3-validation.md)
- [V0.2 游戏系统设计总稿](docs/game-design-v0.2.md)
- [V0.1 升级卡池 V1](docs/upgrade-card-pool-v0.1.md)
- [Upgrade Director V1](docs/upgrade-director-v1.md)
- [Decision Log](docs/decision-log.md)

## 里程碑

```text
M0.1  基础战斗                  ✓
M0.2  Run EXP + 三选一 + LMG    ✓
M0.3  5 种随机武器              ← 当前
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
