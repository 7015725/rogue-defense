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
- CI 会把最终构建状态回写为 `ci/build` commit status，便于直接验证 `main`。

## 2026-08-11 — M0.3 武器基础形态

- 随机武器池正式扩展为 LMG / Shotgun / Sniper / Auto-GL / Tesla 五种。
- 一局最多从随机池获得 4 把，连同固定 Auto Cannon 总数最多 5。
- Shotgun 采用锥形数学判定而不是 12 个真实 Projectile。
- Sniper 使用 `highest-hp` 索敌。
- Auto-GL 使用固定落点 + 延迟 AOE，普通榴弹允许打空。
- Tesla 使用 3 目标连锁与临时轻量 Stun；正式 StatusEffectSystem 仍属于 M0.7。
- 第一把随机副武器继续保留结构性展示保护，但不指定具体武器，也不会自动给予。

## 2026-08-11 — M0.4 武器成长路线

- Auto Cannon + 五种随机武器全部统一使用 Lv1～10。
- 普通三选一可以升级任意已拥有且未满级的武器。
- Lv5 达成后立即免费选择 α / β / γ，选择后本局锁定。
- Lv10 达成后根据 Lv5 路线再免费选择 3 个专精之一，选择后本局锁定。
- 路线选择不消耗额外 Run Upgrade，且路线 Overlay 期间战斗完全暂停。
- Lv4→5、Lv9→10 的武器升级获得轻度权重保护，不做自动升级。
- 武器分支数据集中在 `src/weapons/WeaponProgression.ts`，战斗层消费合并后的 `BranchEffect`。
- BranchEffect 支持改变伤害、射速、射程、弹匣、Reload、暴击、穿甲、WeaponMode、AOE、Chain、MultiShot 等。
- Shotgun β 独头弹会真实切换到 Projectile 模式。
- Auto-GL β 弹跳榴弹会产生连续多次爆炸。
- Tesla β 地面放电会真实切换到径向 AOE。
- 龙息 Burn、烟幕 AttackSpeed Debuff 等正式状态效果继续留到 M0.7，不为 M0.4 建立第二套临时状态系统。

## 2026-08-11 — M0.5 Armor + Heavy

- Armor 正式抽成独立 `ArmorSystem`，常规直接伤害统一使用 `Armor / (Armor + 100)`。
- 玩家可见 Armor Grade 统一为 UNARMORED / LIGHT / MEDIUM / HEAVY；等级是敌人身份，不随 Wave 无限上涨。
- Infantry = Armor 0 / UNARMORED；Heavy = Armor 100 / HEAVY；Wave 10 Boss = Armor 20 / LIGHT。
- Heavy 基础数值：HP 220、MoveSpeed 36、AttackDamage 22、EXP 14、Credits 6。
- Wave 6～9 逐步混入 1 / 2 / 2 / 3 个 Heavy，并在生成节奏中分散出现。
- M0.4 已存在的 Armor Penetration 路线从本阶段开始正式形成敌人克制价值。
- `Targetable` 增加 `applyArmorBreak(amount, durationMs)`；Enemy 支持临时 ArmorBreak，结束后自动恢复。
- ArmorBreak 暂不加入新卡池，预留给 M0.7 震荡破甲 Combo 和未来武器核心。
- 有甲敌人显示 Armor Grade 标签，HUD 在 Heavy 存活时显示 Heavy 数量。

完整细节见 `game-design-v0.2.md`、`m0.4-design.md`、`m0.5-design.md`。
