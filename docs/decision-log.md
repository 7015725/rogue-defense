# Decision Log

## 2026-08-11 — 项目基础方向

- Web-first，后续使用同一套代码封装 Android APK。
- 技术栈采用 Phaser + TypeScript + Vite。
- 战场纵向：敌人从顶部向下，基地/武器位于底部。
- 单局最多 5 套独立武器系统，Slot 1 固定基础自动炮。
- 普通 Wave 固定时间推进且不清残怪；每 10 Wave 使用 Boss Gate。
- 局内 Roguelite 构筑是核心，局外科技仅提供长期成长和选择空间。

## 2026-08-11 — 仓库工作流

- 后续开发直接修改 `main`，不再为每个里程碑创建分支或 PR。
- `main` push 继续触发 GitHub Actions CI。
- CI 使用 concurrency；同一分支的新提交会取消已过期的旧构建，只保留最新状态验证。

## 2026-08-11 — M0.3 武器基础形态

- 随机武器池正式扩展为 LMG / Shotgun / Sniper / Auto-GL / Tesla 五种。
- 一局最多从随机池获得 4 把，连同固定 Auto Cannon 总数最多 5。
- Shotgun 采用锥形数学判定而不是 12 个真实 Projectile。
- Sniper 使用 `highest-hp` 索敌。
- Auto-GL 使用固定落点 + 延迟 AOE，普通榴弹允许打空。
- Tesla 使用 3 目标连锁与临时轻量 Stun；正式 StatusEffectSystem 仍属于 M0.7。
- 第一把随机副武器继续保留结构性展示保护，但不指定具体武器，也不会自动给予。

完整细节见 `game-design-v0.2.md`、`m0.3-design.md`。
