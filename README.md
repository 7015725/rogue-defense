# Rogue Defense

单机纵向 Roguelite 塔防。敌人从屏幕顶部向下推进，基地与最多 5 套独立武器系统位于底部自动防守；玩家通过局内构筑、Boss 商店与局外科技持续推进 Endless Wave。

## 当前阶段

**V0.1 Web Release Candidate — `0.1.0-rc.1`**

M0.1～M0.9 的主要系统、Endless Wave、W100 解锁链、DEV Playtest/Stress 工具均已落地。RC 阶段停止扩张核心系统，重点转为浏览器 Gate、真长局、平衡、UI、性能和真实设备回归。

当前代码具备：

- 1000×1600 纵向战场；
- 30 秒普通 Wave、24 秒 Spawn Window、残怪跨 Wave 堆积；
- 动态 Population Budget + Reinforced Wave；
- 每 10 Wave Boss Gate + Boss Shop，W100 后继续 W101+；
- Wave HP / Damage / Run Reward Scaling；
- Heavy / Armor / Ground-Air TargetDomain；
- Auto Cannon + 5 种随机武器，最多 5 武器；
- 所有 6 把武器 Lv1～10、Lv5 α/β/γ、Lv10 专精；
- StatusEffectSystem + 首批 4 个 Combo；
- Run EXP / Level Up 三选一 / Skip / Reroll；
- Boss Shop / Weapon HP / Repair / Replacement；
- MainMenu / Combat / Settlement；
- Account Lv1～100 / Gold / Tech Point / Tech Tree / Free Respec；
- Difficulty I～V、独立 High Wave、W100 解锁下一难度；
- Versioned localStorage Save Schema v1；
- 1×～4× 触控/键盘速度；
- DEV W1/W10/W20/W50/W80/W100 快捷启动；
- DEV Stress 300，DEV Settlement 不写永久 Save；
- Projectile Pool / Status Text / HUD 高频路径优化；
- >=180 Active Enemy 自动进入 Crowd LOD，普通敌人主体合批渲染；
- 无 Status Enemy 快速路径；ProjectilePool 仅更新 Active Projectile；
- Safe Area / `100dvh` / Touch 移动端适配；
- PWA Manifest + Service Worker + App Icon；
- Chromium Production Browser Smoke Gate；
- RC Checkpoint Functional Soak；
- CI Fixed-Stress300 性能 Gate；
- CI 自动生成验证后的 Web RC Artifact。

Wave100 是 Difficulty 解锁里程碑，**不是单局结束点**。

## 技术栈

- Phaser 4
- TypeScript
- Vite

Web-first；V0.1 Web 稳定后使用同一套代码进入 Android APK 包装。

## 本地运行

要求 Node.js `20.19+` 或 `22.12+`。

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
npm run preview
```

### Termux / Android arm64

Termux 使用专用初始化脚本处理 TypeScript 7 与 Rolldown 的 Android arm64 native package 兼容问题：

```bash
git clone https://github.com/7015725/rogue-defense.git
cd rogue-defense
npm run setup:termux
npm run dev:lan
```

同一台 Android 设备浏览器：

```text
http://127.0.0.1:5173/
http://127.0.0.1:5173/?dev=1
```

详细说明见 [`docs/TERMUX.md`](docs/TERMUX.md)。

### 手机局域网实机测试

电脑和手机连接同一 Wi-Fi：

```bash
npm install
npm run build
npm run preview:lan
```

手机浏览器访问：

```text
http://<电脑局域网IP>:4173/
```

DEV 快捷测试：

```text
http://<电脑局域网IP>:4173/?dev=1
```

局域网 HTTP 已可验证 Android/iOS 浏览器玩法、Touch、横竖屏、Save 与 Stress300。PWA 安装/Service Worker 实机验收需要 HTTPS，因此放到 Pages 或其他 HTTPS 部署后测试。

浏览器 Smoke Test 使用 Playwright。CI 会自动安装固定版本；本地需要先安装测试依赖与 Chromium：

```bash
npm install --no-save @playwright/test@1.62.1
npx playwright install chromium
npm run build
npm run smoke
```

## 控制

- 战斗 HUD `1× / 2× / 3× / 4×`：触控切速（受科技解锁限制）
- 键盘 `1～4`：切换速度
- `E`：主动结束本局并正常结算

升级、路线、Boss 商店、武器替换和主菜单均支持鼠标/触摸。

## DEV Playtest

本地开发自动显示 DEV LAUNCH；Production 构建可显式加入：

```text
?dev=1
```

支持：

```text
W1 / W10 / W20 / W50 / W80 / W100
Stress 300
```

Start Wave != 1 或 Stress > 0 时，该局为 DEV Run；Settlement 只预览结果，不写 Permanent Save。

## V0.1 RC 自动 Gate

每次 `main` push：

```text
TypeScript strict
→ Vite Production Build
→ Chromium Browser Smoke
→ validated dist Artifact

RC Soak:
Checkpoint Functional
→ Fixed Stress300 Performance
```

Commit Status：

```text
ci/build
ci/smoke
ci/artifact
ci/soak-functional
ci/perf
ci/soak
```

当前 Fixed Stress300 CI Chromium 稳定基线：

```text
W1      20 FPS
W50     20 FPS
W100    20 FPS
```

每档独立采样 3 次并取中位数，最低自动 Gate 保持 15 FPS。该结果只代表 CI Chromium 稳定帧率基线；真机 4×、温度、触控与长时间内存仍需要设备验证。

通过后 CI 上传：

```text
rogue-defense-v0.1-rc1-web
```

Artifact 为完整 `dist/`，保留 14 天。

## PWA / GitHub Pages

PWA 使用原生 Manifest + Service Worker，不增加运行时框架依赖。

仓库已准备手动 Pages 工作流：

```text
.github/workflows/pages.yml
```

仓库当前为 Public。若需要 GitHub Pages，在 Repository Settings → Pages 将 Source 设为 GitHub Actions 后，可运行 `Deploy Web RC to GitHub Pages`。

## 文档

- [设计文档索引](docs/README.md)
- [Termux / Android arm64 开发环境](docs/TERMUX.md)
- [V0.1 Web RC](docs/v0.1-web-rc.md)
- [V0.1 RC Validation](docs/v0.1-rc-validation.md)
- [V0.1 Real-Device Test](docs/v0.1-device-test.md)
- [V0.1 Integration](docs/v0.1-integration.md)
- [V0.1 Playtest / Performance Tools](docs/v0.1-playtest-tools.md)
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
V0.1  Integration / Playtest       ✓
V0.1  Web RC                       ← 当前
       ↓
V0.1  Real-device Playtest
       ↓
V0.1  Web Release
       ↓
Android APK
```

## RC 剩余关键验收

- W1 → W100 真长局；
- 正常 Build 的 W100 Boss → Shop → W101；
- 正常 W100 Settlement 解锁下一 Difficulty；
- Android Chrome / iOS Safari 横竖屏；
- 真机 W1/W50/W100 + Stress300 与 4× 响应；
- PWA 安装、重启与 Service Worker 更新；
- 长局内存、Projectile/Status 峰值；
- Boss Shop / Upgrade Director / Wave Scaling 第一轮平衡。
