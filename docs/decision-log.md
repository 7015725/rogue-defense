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
- M0.9 起 CI 失败时额外回写 `ci/error: ...` status context，直接暴露 TypeScript/Vite 最后一条错误摘要，便于 direct-main 修复。

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

## 2026-08-11 — M0.6 Air + Anti-Air

- TargetDomain 正式加入 GROUND / AIR；Enemy 与 WeaponDefinition 都显式声明目标域。
- Air 使用独立 AirPath：更宽的顶部入口、轻量横向摆动、向 Base 汇聚，但与 Ground 共用 pathProgress 概念。
- 第一种空军为 Recon Drone：HP 60、Armor 0、MoveSpeed 90、AttackDamage 8、AttackInterval 0.8s、EXP 7、Credits 3。
- Flying 不提前出现：Wave 1～19 无 Air，Wave 20 Boss Gate 首次生成 6 架 Recon Drone 护航。
- Wave 10 Boss Gate 不再结束测试；Boss 死亡后清理残怪并继续 Wave 11。Wave 20 Boss 死亡后清理护航并结束 M0.6。
- Auto Cannon / LMG / Sniper 支持 Ground + Air；Shotgun / Auto-GL / Tesla 仅 Ground。
- TargetingSystem 统一执行 Domain 合法性；Cone / AOE / Chain / Split Target 不能绕过目标域限制。
- 防空结构保护：Wave 15+ 缺副防空时 LMG / Sniper 解锁权重 ×3；Wave 18+ 若仍缺且此前未展示过，则下一次升级界面强制包含 LMG 或 Sniper。
- 防空保底只保证出现选项，不自动给予；固定 Auto Cannon 提供最低防空安全线。

## 2026-08-11 — M0.7 Status + Combo

- `Enemy` 原有独立 `stunTimerMs / armorBreakTimerMs` 已迁移到统一 `StatusEffectSystem`。
- 正式状态：BURN / SLOW / FREEZE / STUN / ARMOR_BREAK / CHARGED；烟幕使用补充状态 SUPPRESSED 表达 AttackSpeed Debuff。
- Burn 最多 3 层、5s、1s Tick；DOT 直接扣 HP，不经过 ArmorSystem。
- Slow 可累积，达到 65% 阈值时转换为 Freeze 1s；最大 Slow 75%。
- Tesla 基础命中建立 Charged 2.5s + Stun；Auto-GL γ Smoke 使敌人攻击速度 -40% / 6s。
- Boss 不免疫硬控：连续 STUN/FREEZE 每次提高 15% Control Resistance，最高 75%，并每秒衰减 5 个百分点；最低仍保留 25% 原始控制时长。
- DamageSystem 统一执行 Direct Damage → Combo → 新 Status Application，确保 Projectile / Cone / AOE / Chain / Radial 使用同一触发顺序。
- 首批 4 Combo 为稀有三选一卡：爆燃协议、震荡破甲、电力过载、控制处决；未获得时不会自动触发。
- 爆燃协议：Burn + Explosion，结算 35% 剩余 Burn 潜力并消耗 1 层 Burn。
- 震荡破甲：Hard Control + Heavy Hit，ArmorBreak 35 / 4s。
- 电力过载：Charged + Lightning，主目标追加 35% 本次有效伤害，并向 260 范围最近同 Domain 目标溢出同额电弧伤害。
- 控制处决：Hard Control + Sniper Critical，追加 75% 本次有效伤害。
- Combo 从 Run Lv8+ 开始进入候选池，并根据已拥有武器做基本前置过滤；已获得 Combo 移出本局候选池。
- M0.4 中龙息、温压、烟幕、冲击波的占位路线文案已同步改为当前真实 Status 效果。

## 2026-08-11 — M0.8 Boss Shop

- Boss Gate 正式变成阶段结算节点：Boss 死亡后清残怪、完全暂停、打开 Boss Shop，只有显式离店后 Wave 才继续。
- 当前测试范围扩展到 Wave 30；Wave 10 / 20 / 30 都打开 Boss Shop，Wave 30 离店后结束 M0.8 测试。
- Boss Shop 固定 5 格，Slot 1 为付费后勤位（Base Heal 或 Weapon Repair），其余 4 格从合法商品池生成，完全相同商品 ID 不同屏重复。
- 商店商品包含：Base Heal、Weapon Repair、全局伤害、全局攻速、Base MaxHP、已有武器 +1 Lv、新武器/替换、Combo Mechanism、Reroll Charge。
- W10 基础价格随 Checkpoint 轻度上涨：W20 ×1.15、W30 ×1.30；刷新价格每个商店独立使用 60 / 120 / 240 / 480…。
- RunState 正式增加可消费 Credits API 与 Reroll Charges；Level Up Overlay 可以消耗 Charge 重新生成三选一，不消耗 Pending Upgrade。
- 武器正式获得 MaxHP / CurrentHP / Disabled / AutoRepair / Repair API。HP=0 后停火并自修，恢复至 25% MaxHP 后重新上线；Boss Shop Repair 直接满修。
- M0.8 暂未加入会主动攻击武器的 Engineer/Bomber，耐久系统先作为后续敌人技能接口。
- 满 4 个随机武器槽后，Boss Shop 仍可出售未拥有武器；购买先进入 Replacement Overlay，取消不扣钱，确认后才替换。
- Auto Cannon 永不可替换；随机武器替换会 destroy 旧实例并复用原槽位置，旧 Lv5/Lv10 路线丢失。
- 替换等级补偿：W10 Lv2、W20 Lv4、W30 Lv6；补偿跨过 Lv5/Lv10 时立即触发对应免费路线选择。
- 新武器和替换武器即时继承当前 Global Modifiers 与 Active Combos。
- Wave 21～29 开始在常规敌潮中混入 Flying；Wave 30 Boss 使用 8 架 Recon Drone 护航。

## 2026-08-11 — M0.9 Settlement + Permanent Progress

- Phaser 正式拆为 MainMenuScene / CombatScene / SettlementScene；应用启动进入 Main Menu。
- Run End 统一产生 `RunSummary`：Difficulty、Highest Wave、Run Level、Kills、Boss Kills、结束原因。
- Base Destroyed、主动结束、Wave30 测试完成都进入同一个 Settlement；主动结束获得 100% 正常结算，不做惩罚。
- 正式流程取消 `R` 无结算重开；`E / 结束本局` 进入 Settlement。
- Settlement 奖励分为 Gold + Account EXP，并受 Difficulty Reward Multiplier 影响；奖励公式属于 V1 原型值。
- Account Level 上限 100；每级所需 EXP 为 `100 + (Level-1)×30`；每升一级获得 1 Tech Point。
- 永久存档使用 `rogue-defense.save`，Schema Version = 1；只保存永久数据，不序列化 Scene / Enemy / Weapon / Run 状态。
- SaveService 对缺字段、越界值、旧/未知 version 做 normalize / migrate / sanitize；非法 JSON 或 localStorage 异常回退默认 Save。
- Lifetime Stats 记录 Runs、Kills、BossKills、TotalGoldEarned、HighestRunLevel；High Wave 按 Difficulty 独立保存。
- Difficulty I～V 数据层已建立。当前通用倍率：HP 1.00/1.20/1.45/1.75/2.10；Damage 1.00/1.10/1.20/1.35/1.50；Settlement Reward 1.00/1.15/1.35/1.60/2.00。
- 下一难度仍严格要求当前最高已解锁 Difficulty 达到 Wave100；当前 Wave30 原型不会临时降低解锁条件。
- 首版 Gold Tech：火力训练（每级开局 Damage +3%，Max10）、基地加固（每级 Base MaxHP +5%，Max10）、战备资金（每级开局 Credits +20，Max5）。
- 首版 Tech Point Tech：战术加速（依次解锁 2×/3×/4×）、预备重抽（每级开局 +1 Reroll Charge，Max2）。
- Tech Tree 支持永久免费重置，并原额返还全部 Gold / Tech Point 投入。
- CombatScene 在 Run 开始时读取 Permanent Save，使 Meta 起点和局内 Upgrade 正常叠加。
- M0.9 是最后一个主要系统里程碑；后续进入 V0.1 Integration，不再优先扩新系统。

## 2026-08-11 — V0.1 Integration / Endless Wave

- 固定 Wave1～30 测试表正式退出运行逻辑，由 `WaveDirector` 根据 Population Budget 动态生成所有普通 Wave。
- Population Cost：Infantry 1.0、Flying 1.5、Heavy 2.5；Budget 使用 W1～10 / W11～20 / W21～50 / W51+ 四段线性曲线。
- 每 5 Wave 且不是 Boss Wave 为 Reinforced Wave，Population Budget ×1.10；HUD 显示 `REINFORCED`。
- 保留早期重甲身份：W6/W7/W8/W9 至少 1/2/2/3 个 Heavy；W21+ 常规 Wave 至少 1 个 Flying。
- 所有 10 的倍数都成为 Boss Gate，不再限制到 W30；Boss 死亡后进入 Boss Shop，离店后继续下一 Wave。
- Boss Air Escort 从 W20=6、W30=8 继续按 Checkpoint 增长，最高 20。
- Wave HP Scaling 使用 `(1 + 0.055×(W-1)) × 1.018^(W-1)`；W100 ≈×37.69。
- Wave Damage Scaling 使用 `(1 + 0.035×(W-1)) × 1.012^(W-1)`；W100 ≈×14.54。
- Wave Scaling 与 Difficulty HP/Damage Multiplier 相乘；Armor 继续作为敌人身份，不随 Wave 自动成长。
- Run EXP / Combat Credits 使用 `1 + (Wave-1)×0.01` 的击杀奖励倍率，上限 ×2.5；按当前预算粗算 W100 Run Level 约 Lv65。
- CombatScene 取消 Wave30 自动结束，并移除 `highestWave = min(30, currentWave)`；Settlement 记录真实最高 Wave。
- Wave100 是 Difficulty 解锁里程碑，不是 Run End；W100 Boss Shop 离店后正常进入 W101+。
- M0.9 的 W100 解锁条件保持不变：只有当前最高已解锁 Difficulty 达 W100，结算时才解锁下一档。
- V0.1 Integration 后续工作以真实浏览器 Playtest、平衡、UI、性能、Save/Settlement 长局回归为主，不优先扩新核心系统。

完整当前规格见 `v0.1-integration.md`；历史里程碑细节继续保留在对应 M0.x 文档中。
