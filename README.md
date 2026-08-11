# Rogue Defense

单机纵向 Roguelite 塔防项目。敌人从屏幕顶部向下推进，基地与最多 5 套独立武器系统位于底部自动防守；玩家通过局内构筑、Boss 商店与局外科技持续推进无尽 Wave。

## 当前阶段

**M0.7 — Status + Combo**

当前原型已经具备：

- 1000×1600 纵向战场；
- 30 秒固定 Wave 与残怪堆积；
- Wave 10 / 20 Boss Gate；
- Run EXP / Run Level / Credits；
- Level Up 完全暂停；
- 三选一与 Skip → Credits；
- Slot 1 固定 Auto Cannon + 4 个随机武器槽；
- 五种随机武器池：LMG、Shotgun、Sniper、Auto-GL、Tesla；
- 所有 6 把武器可独立 Lv1～10；
- Lv5 α / β / γ 路线 + Lv10 路线专精；
- Armor Grade / ArmorSystem / Heavy Armored Enemy；
- GroundPath / AirPath / TargetDomain；
- Recon Drone 与防空随机保护；
- 统一 StatusEffectSystem：Burn / Slow / Freeze / Stun / ArmorBreak / Charged / Suppressed；
- Shotgun α 龙息 Burn；
- Auto-GL α Slow、γ Smoke AttackSpeed Debuff；
- Tesla Stun + Charged；
- Boss 连续 Hard Control Resistance；
- 首批 4 个 Combo 三选一卡：爆燃协议 / 震荡破甲 / 电力过载 / 控制处决；
- Projectile / Cone / AOE / Chain / Radial 共用 Damage → Combo → Status 管线；
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

升级与武器路线界面使用鼠标或触摸点击卡牌。

## 文档

- [设计文档索引](docs/README.md)
- [M0.7 设计](docs/m0.7-design.md)
- [M0.7 验证清单](docs/m0.7-validation.md)
- [M0.6 设计](docs/m0.6-design.md)
- [M0.5 设计](docs/m0.5-design.md)
- [M0.4 设计](docs/m0.4-design.md)
- [V0.2 游戏系统设计总稿](docs/game-design-v0.2.md)
- [V0.1 升级卡池 V1](docs/upgrade-card-pool-v0.1.md)
- [Upgrade Director V1](docs/upgrade-director-v1.md)
- [Decision Log](docs/decision-log.md)

## 里程碑

```text
M0.1  基础战斗                     ✓
M0.2  Run EXP + 三选一 + LMG       ✓
M0.3  5 种随机武器                 ✓
M0.4  Lv1～10 + Lv5/Lv10 路线      ✓
M0.5  Armor + 重甲                 ✓
M0.6  Air + 防空                   ✓
M0.7  Status + Combo               ← 当前
M0.8  Boss Shop
M0.9  结算 + 科技树 + Save
V0.1  完整 Web 可玩版
       ↓
Android APK
```
