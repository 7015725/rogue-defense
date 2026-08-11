# Rogue Defense

单机纵向 Roguelite 塔防项目。敌人从屏幕顶部向下推进，基地与最多 5 套独立武器系统位于底部自动防守；玩家通过局内构筑、Boss 商店与局外科技持续推进无尽 Wave。

## 当前阶段

**M0.9 — Settlement + Permanent Progress + Save**

当前原型已经具备：

- 1000×1600 纵向战场；
- 30 秒固定 Wave 与残怪堆积；
- Wave 10 / 20 / 30 Boss Gate；
- Run EXP / Run Level / Credits；
- Level Up 三选一、Skip 与 Reroll；
- Slot 1 固定 Auto Cannon + 4 个随机武器槽；
- 五种随机武器池：LMG、Shotgun、Sniper、Auto-GL、Tesla；
- 所有 6 把武器 Lv1～10；
- Lv5 α / β / γ 路线 + Lv10 路线专精；
- Armor / Heavy / Ground-Air TargetDomain；
- StatusEffectSystem 与首批 4 个 Combo；
- Boss Shop：5 商品、后勤位、刷新、Heal / Repair / Upgrade / Weapon / Combo / Reroll；
- Weapon HP / Disabled / AutoRepair / Replacement；
- MainMenuScene / CombatScene / SettlementScene 完整流程；
- Account Lv1～100、Gold、Tech Point；
- 首版局外 Tech Tree + 免费 Respec；
- Difficulty I～V 数据层、High Wave 与 W100 解锁规则；
- Versioned localStorage Save Schema v1 + normalize / migrate / 坏档回退；
- Lifetime Runs / Kills / Boss Kills / Gold / Highest Run Level；
- 1×～4× 速度正式由局外科技逐步解锁。

M0.9 是最后一个主要系统里程碑。下一阶段进入 **V0.1 Integration**：真实浏览器试玩、回归验证、数值、UI、性能、无尽 Wave 与最终打包准备。

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
- `2`：2×（需科技）
- `3`：3×（需科技）
- `4`：4×（需科技）
- `E`：主动结束本局并正常结算

升级、路线、Boss 商店和主菜单均支持鼠标/触摸点击。

## 文档

- [设计文档索引](docs/README.md)
- [M0.9 设计](docs/m0.9-design.md)
- [M0.9 验证清单](docs/m0.9-validation.md)
- [M0.8 设计](docs/m0.8-design.md)
- [M0.7 设计](docs/m0.7-design.md)
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
M0.7  Status + Combo               ✓
M0.8  Boss Shop                    ✓
M0.9  结算 + 科技树 + Save         ← 当前
V0.1  Integration / Playtest
       ↓
Web / PWA
       ↓
Android APK
```
