# Rogue Defense

单机纵向 Roguelite 塔防项目。敌人从屏幕顶部向下推进，基地与最多 5 套独立武器系统位于底部自动防守；玩家通过局内构筑、Boss 商店与局外科技持续推进 Endless Wave。

## 当前阶段

**V0.1 Integration — Playtest / Performance / Mobile**

M0.1～M0.9 的主要系统已经全部落地，Endless Wave 与 W100 解锁链也已接通。当前阶段停止扩张主要系统，转向真实长局、开发测试效率、数值、UI、性能与浏览器运行时回归。

当前代码已经具备：

- 1000×1600 纵向战场；
- 30 秒固定普通 Wave、24 秒 Spawn Window、残怪跨 Wave 堆积；
- 正式 Endless Wave Director，不再使用 Wave1～30 固定测试表；
- Population Budget：Infantry 1 / Flying 1.5 / Heavy 2.5；
- 每 5 Wave 非 Boss 的 Reinforced Wave；
- 每 10 Wave Boss Gate + Boss Shop，W100 后继续 W101+；
- Wave HP / Damage 连续成长曲线；
- W6 起 Heavy，W20 Boss 首次 Air Escort，W21+ 常规 Flying；
- Run EXP / Combat Credits 随 Wave 温和增长；
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
- Difficulty I～V、独立 High Wave 与 W100 解锁下一难度；
- Versioned localStorage Save Schema v1；
- Lifetime Runs / Kills / Boss Kills / Gold / Highest Run Level；
- 1×～4× 速度由局外科技逐步解锁；
- 战斗内 1×～4× 触控速度按钮；
- DEV W1/W10/W20/W50/W80/W100 快捷启动；
- DEV Stress 300 性能测试；
- DEV Run 结算预览但不写永久 Save；
- Projectile Pool Active Count 缓存与清场；
- Enemy Status Text 懒创建 + 150ms 可视刷新；
- Combat HUD 100ms 刷新节流；
- `100dvh` / Safe Area / Touch 行为移动端适配。

Wave100 是 Difficulty 解锁里程碑，**不是单局结束点**。玩家可以继续当前局直到 Base Destroyed 或主动结束。

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

- 战斗 HUD `1× / 2× / 3× / 4×`：触控切速（仍受科技解锁限制）
- 键盘 `1～4`：切换速度
- `E`：主动结束本局并正常结算

升级、路线、Boss 商店、武器替换和主菜单均支持鼠标/触摸点击。

## DEV Playtest

本地 `npm run dev` 会自动显示 DEV LAUNCH。Production 构建可显式使用：

```text
?dev=1
```

DEV 面板支持：

```text
W1 / W10 / W20 / W50 / W80 / W100
Stress 300
```

快捷启动或 Stress 局会标记为 DEV Run，结算仅预览，不修改永久存档。

详见 [`docs/v0.1-playtest-tools.md`](docs/v0.1-playtest-tools.md)。

## 文档

- [设计文档索引](docs/README.md)
- [V0.1 Integration](docs/v0.1-integration.md)
- [V0.1 Playtest / Performance Tools](docs/v0.1-playtest-tools.md)
- [V0.1 Validation](docs/v0.1-validation.md)
- [M0.9 设计](docs/m0.9-design.md)
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
M0.9  结算 + 科技树 + Save         ✓
V0.1  Integration / Playtest       ← 当前
       ↓
V0.1 Web Release Candidate
       ↓
Web / PWA
       ↓
Android APK
```

## V0.1 当前验收重点

- 实际浏览器从 W1 跑到 W100；
- W99 → W100 Boss → Shop → W101 完整流程；
- 正常 Run 的 Difficulty W100 解锁下一档；
- Boss Shop / Upgrade Director 长局经济；
- Android Chrome / iOS Safari 竖屏与触摸交互；
- DEV W1/W50/W100 + Stress 300 性能；
- 4× 下 Projectile / Status / Combo 峰值性能；
- Save 刷新、坏档和长局 Settlement 回归。
