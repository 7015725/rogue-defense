# 开源肉鸽塔防参考与 V0.1 落地决策

> 状态：V0.1 RC 平衡/UI 专项基线  
> 日期：2026-08-13

## 1. 目标

本轮调研不复制单个项目，而是从不同开源塔防/肉鸽项目中抽取已经被实践验证的结构，用于 Rogue Defense 当前的“上方来敌、下方炮台、自动战斗、局内三选一、局外成长”框架。

本轮优先解决：

- 波次节奏是否有明确的 5/10 Wave 压力节点；
- 玩家是否可以主动承担风险换取经济；
- HUD 是否能让玩家快速判断武器升级价值；
- 随机成长和稳定成长是否各自承担清晰职责；
- 是否能在不推翻 V0.1 RC 的前提下吸收成熟项目经验。

## 2. 参考项目

### Cards-TD

仓库：<https://github.com/Sylvye/Cards-TD>

定位是 Tower Defense + Deckbuilder + Roguelike。主要参考其“单局构筑改变战斗规则”的方向，而不是照搬卡组抽牌。

Rogue Defense 对应：

- 保留 Run Level Up 三选一；
- 保留 Combo 作为高价值协同；
- 武器分支负责改变行为，普通数值卡只负责稳定成长；
- 不增加手牌/出牌操作，避免破坏自动塔防节奏。

### Anuto TD

仓库：<https://github.com/mjaun/android-anuto>

主要参考：

- 移动端直接、低层级的塔防信息展示；
- 塔详情中展示 Damage / Reload / DPS / Range 等决策信息；
- 提前开启下一波并获得额外经济的风险收益机制；
- 难度和经济参数集中管理。

Rogue Defense 对应：

- 武器 HUD 增加理论持续 DPS；
- 普通 Wave 在全部敌人完成出场后允许提前进入下一 Wave；
- 提前开波保留场上的旧敌人，因此本质是“用重叠压力换 Credits”，而不是跳怪；
- Boss Wave 与 W10 结算关卡禁止提前，避免绕过关键节点。

许可证：Anuto 为 GPL-2.0。这里只借鉴机制和比例关系，不复制其实现代码或美术资源。

### Princeton Tower Defense

仓库：<https://github.com/Kevin-Liu-01/Princeton-Tower-Defense>

主要参考：

- Web/Canvas 塔防的信息层级；
- 分支升级而不是无限单线等级；
- 波次、敌人、塔和设置数据化；
- 周期性特殊 Wave 形成可预期节奏。

Rogue Defense 当前已经具备 Lv5 路线与 Lv10 专精，因此本轮不重做升级树，只强化 5/10 Wave 的节奏标识。

### Mindustry

仓库：<https://github.com/Anuken/Mindustry>

主要参考其长期局中数值倍率、规则参数化和信息可读性。Rogue Defense 不采用其建造/资源链玩法，只借鉴“规则可调、后期允许明显数值膨胀”的设计原则。

### SIKMUBYNCH

主要参考“大量敌人 + 自动战斗 + Wave Clear 三选一 + 强化节点”的组合思路。其公开说明中的每级显著成长适合低等级塔，但 Rogue Defense 当前武器等级上限为 100，因此不能直接照搬“每级 +30%”。

## 3. V0.1 实际采用的节奏

当前不把 W5 强行改成 Boss，而采用兼容既有 RC 的四层节奏：

| 节点 | 定义 | 目的 |
|---|---|---|
| 普通 Wave | 常规 Population Budget | 稳定资源与 EXP |
| W5 / W15 / ... | Elite / Reinforced | 中段压力检查 |
| W10 | Gate / Shop Checkpoint | 经济整理和 Build 调整 |
| W20 起每 10 Wave | Boss Gate + Shop | 真正 Boss 与关键长局压力 |

注：W10 本身是普通 Shop Checkpoint；W20、W30、W40... 同时属于 Boss/Checkpoint，由 Boss 击杀触发商店。

### W5 Elite 调整

Reinforced Wave 的 Population Budget 加成由 8% 调整为 12%。

理由：

- 8% 在随机生成和普通单位密度中不够明显；
- 12% 能形成可感知压力，但远低于“新增 Boss”的系统级变化；
- 不改变 Enemy HP Scaling 公式，避免同时叠加两个变量导致难以归因。

## 4. 提前开波

### 解锁条件

只有同时满足以下条件才显示为可用：

1. 当前不是 Boss Wave；
2. 当前不是 W10 的 Shop Checkpoint；
3. 当前 Wave 的生成计划已经全部释放；
4. 当前 Wave 计时仍有至少 250ms。

### 行为

按 HUD 按钮或 `N`：

- 立即把 Wave +1；
- 当前场上敌人不清除；
- 下一 Wave 正常开始生成；
- 玩家获得 Early Wave Credits。

因此玩家是在主动制造 Wave 重叠，而不是跳过未生成敌人。

### V0.1 奖励公式

```text
TimeBonus = ceil(剩余秒数) × 2 C
PressureBonus = min(8, 当前场上敌人数 × 1 C)
EarlyBonus = min(20 C, TimeBonus + PressureBonus)
```

V0.1 的 Spawn Window 为 24 秒、Wave Duration 为 30 秒，所以正常情况下最大可节省约 6 秒；奖励上限 20 C 用于防止经济滚雪球过快。

## 5. HUD：理论持续 DPS

底部武器 HUD 增加 `DPS≈`。

V0.1 计算包含：

- 当前武器实际 Damage；
- 当前实际 Attack Interval；
- 基础暴击率与暴击倍率的期望值；
- 弹匣容量；
- 基础 Reload Time。

这是用于比较升级价值的近似指标，不代表完整战斗模拟：链式闪电、多目标爆炸、霰弹命中颗数、状态伤害、Combo、部分分支换弹修正不会全部折算为单一 DPS。

UI 使用 `≈` 明确表示估算值。

## 6. 当前已经具备、无需重复实现的参考机制

- Run EXP 触发三选一；
- Skip 换 Credits；
- Reroll Charge；
- 武器 Lv5 路线选择；
- Lv10 路线专精；
- Combo 协同；
- Boss Checkpoint Shop；
- 武器满槽替换；
- Population Budget 与 Endless Wave Scaling；
- W20+ 防空压力与随机保护。

因此本轮重点是把这些系统之间的反馈做得更清晰，而不是继续叠新系统。

## 7. 明确不直接采用的数值

### 不采用“每级 +30%”

Rogue Defense 的武器等级上限是 100。若每级乘 1.3，长期数值会指数失控，并使 Lv5/Lv10 分支选择失去相对价值。

当前策略：

- 武器等级 = 高频、稳定的小幅成长；
- Lv5 / Lv10 = 大幅改变玩法方向；
- Combo = 条件式协同跃迁；
- Boss Shop = 经济驱动的定向修正。

### 不立即把 W5 改成 Boss

现有 RC 已围绕 W20 空军/Boss、W10 Shop、Endless Scaling 建立自动化测试。W5 直接加入 Boss 会同时影响伤害门槛、商店经济、升级获得速度、Difficulty 解锁与长局测试，不适合在本轮一次性修改。

## 8. 后续 Playtest 指标

优先记录：

- W1~W10 平均提前开波次数；
- 提前开波获得 Credits / 总 Credits 的占比；
- 因连续提前导致 Base 掉血或死亡的比例；
- W5/W15 Elite 的通过率和平均剩余 Base HP；
- 各武器 HUD DPS 与真实击杀贡献的偏差；
- W10 首次商店的平均可购买商品数；
- W20 Boss 前玩家平均武器数量、平均武器等级、Combo 数量。

若 Early Wave Credits 占总收入长期超过约 25%，优先下调时间奖励或总上限；若几乎没人使用，则提高按钮反馈或略增奖励，而不是先提高 Enemy Scaling。

## 9. 版权与许可证边界

本项目只借鉴公开项目的机制、数值比例、信息架构和交互思路。第三方项目的源代码、美术、音频和文本不直接复制进本仓库；若未来需要引入具体代码，必须先逐仓库确认许可证及其传染性/署名要求。
