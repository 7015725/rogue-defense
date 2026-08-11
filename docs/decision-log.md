# Decision Log

## 2026-08-11 — 项目基础方向

- Web-first，后续使用同一套代码封装 Android APK。
- 技术栈采用 Phaser + TypeScript + Vite。
- 战场纵向：敌人从顶部向下，基地/武器位于底部。
- 单局最多 5 套独立武器系统，Slot 1 固定基础自动炮。
- 普通 Wave 固定时间推进且不清残怪；每 10 Wave 使用 Boss Gate。
- 局内 Roguelite 构筑是核心，局外科技仅提供长期成长和选择空间。

完整细节见 `game-design-v0.2.md`。
