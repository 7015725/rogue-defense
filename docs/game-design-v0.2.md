# 放置类塔防单机游戏 V0.2 游戏系统设计总稿

> 目标平台：Web 优先，Android 次优先  
> 美术方向：像素风  
> 核心类型：全自动战斗 + 无尽塔防 + 局内 Roguelite 构筑 + 局外永久成长  
> 核心结构：一个基地 + 最多 5 套独立武器系统

## 1. 核心定位

玩家不直接控制战斗，而是控制构筑。

- 武器自动索敌、自动攻击。
- Wave 按固定时间推进，不等待清场。
- 敌人抵达基地后持续攻击，基地 HP 归零结束。
- 玩家通过局内等级获得三选一，形成不同 Build。
- 每 10 Wave 出现 Boss，击败后进入商店。
- 可主动结束并 100% 正常结算。
- 每个难度均为无尽模式。
- 局外通过等级、金币、科技点、科技树进行永久成长。

核心体验：

> 炮台负责战斗，玩家负责构筑。

---

## 2. 游戏循环

```text
主界面
→ 选择难度
→ 开始一局
→ 自动战斗
→ 击杀获得局内 EXP + 战斗币
→ 局内升级三选一
→ 获得/升级武器、属性、机制
→ Boss
→ Boss 商店
→ 继续无尽 Wave
→ 敌人逐渐堆积
→ 基地死亡 / 主动结束
→ 结算金币 + 局外 EXP
→ 局外等级 / 科技树
→ 下一局
```

---

## 3. 三层数据架构

### Combat Layer
- Base
- Weapon
- Enemy
- Projectile
- Targeting
- Damage
- Armor
- StatusEffect
- Combo
- Wave
- Boss
- WeaponRepair
- Statistics

### Run Layer
每局重置：
- 当前难度
- 当前 Wave
- 局内等级 / EXP
- 局内战斗币
- 当前武器
- 武器等级与分支
- 当前升级与标签
- 刷新次数
- 击杀 / Boss / DPS / 存活时间

### Permanent Layer
永久保存：
- 局外等级 / EXP
- 局外金币
- 科技点
- 科技树
- 难度解锁
- 每难度最高 Wave
- 图鉴
- 战斗速度
- 离线收益科技
- 装备系统预留

---

## 4. 基地与五武器系统

### 基地
- 固定在路线终点附近。
- 地面敌人抵达后停留持续攻击基地。
- Base HP <= 0 时结束本局。
- 支持最大生命、减伤、回复、击杀回血等。

### 武器槽
```text
Slot 1：固定基础自动炮
Slot 2：局内随机武器
Slot 3：局内随机武器
Slot 4：局内随机武器
Slot 5：局内随机武器
```

5 个槽位是 **5 套独立攻击系统**，每把武器独立：
- 索敌
- 伤害
- 攻速
- 射程
- 弹道
- 弹匣 / 换弹
- HP / 维修
- 武器等级
- Lv5 / Lv10 分支
- 专属机制
- 进化

同一种武器一局最多一把。

允许玩家只使用 2~3 把武器，形成少武器集中强化 Build。

---

## 5. 武器统一成长

```text
Lv1
↓
Lv2 基础强化
↓
Lv3 基础强化
↓
Lv4 基础强化
↓
Lv5 α / β / γ 路线三选一
↓
Lv6~Lv9 路线定向强化
↓
Lv10 根据 Lv5 路线再次三选一
↓
专属核心池
↓
核心模组
↓
未来科技进化
```

规则：
- 武器升级本身占局内三选一机会。
- 到 Lv5 / Lv10 时，额外免费弹出路线选择。
- Lv5 路线本局锁定。
- Lv10 选项由 Lv5 路线决定。
- Lv10 后不再升 Lv11，改为出现武器专属核心。
- 进化要求：Lv10 + 指定 Lv5 路线 + 指定 Lv10 专精 + 核心模组。
- 不匹配当前路线的核心模组不出现。
- 进化后仍占原槽位。
- Lv5 / Lv10 分支全部继承。
- 进化时武器恢复满 HP，并重置换弹 / 蓄力 / 过热等即时状态。
- 架构支持二次进化，但近期不做。

---

## 6. V0.1 固定主炮：基础自动炮

定位：中速、中伤、中射程、无明显短板。

基础：
- 实体弹丸
- 标准弹匣
- 需要换弹
- 优先最靠近基地目标

### Lv5 α：长管精确射击
射程、弹速、伤害提高，攻速略降。

Lv10：
- 穿甲炮弹
- 高膛压装药
- 精准火控

### Lv5 β：双联自动炮
双发，单发伤害下降。

Lv10：
- 交替供弹
- 同步齐射
- 分区火控

### Lv5 γ：快速循环机构
高攻速、小弹匣、高换弹频率。

Lv10：
- 快速换弹
- 最后一发
- 战斗装填

---

## 7. V0.1 随机武器池

首发随机池：
1. 轻机枪阵地
2. 战术霰弹碉堡
3. 栓动狙击台
4. 自动榴弹炮
5. 电击枪塔

后续继续添加武器，但最大槽位仍为 5。

---

## 8. 轻机枪阵地 LMG Nest

定位：持续火力 / 高频触发 / 通用。

基础：中低伤害、中高射速、中射程、大弹匣、可对空。

### α 重枪管
- 射程 +50%
- 伤害 +40%
- 射速 -25%

Lv10：
- 钨芯弹
- 稳定枪架
- 强化膛压

进化方向：磁轨加速机枪。

### β 双联装
同时攻击 2 个目标，总理论伤害接近不变，默认不能集火。

Lv10：
- 独立火控
- 交叉火网
- 弹幕覆盖

进化方向：纳米弹雨发生器。

### γ 弹链供弹
- 射速 +120%
- 连射 6 秒
- 强制换弹 2.5 秒

Lv10：
- 超大弹箱
- 极速装填
- 红线射击

首批实际进化之一：
`γ路线 + 对应Lv10专精 + 电磁加速核心 → 磁轨加速机枪`

---

## 9. 战术霰弹碉堡

定位：近距离锥形 AOE / 贴脸爆发。

基础：
- 视觉 12 弹丸
- 逻辑使用锥形数学判定
- 距离越近命中弹丸越多
- 贴脸最高约 ×3
- 不对空

### α 龙息弹
附加 Burn，可叠层并刷新持续时间。

Lv10：
- 高温燃烧剂
- 火焰蔓延
- 爆燃弹药

### β 独头弹
取消散射，改为巨型穿透单弹。

Lv10：
- 钨芯独头弹
- 震荡弹头
- 猎杀弹

### γ 全自动战斗霰弹
高射速、24 发弹匣、需要换弹。

Lv10：
- 鼓式弹仓
- 快速循环枪机
- 扫荡射击

---

## 10. 栓动狙击台

定位：超远距离高价值目标处决。

基础：
- 全场射程
- 极慢攻速
- 蓄力 1.2 秒
- 高单发
- 优先最高 HP
- 可对空

### α 反器材
高伤，对精英 / 装甲特化，攻速进一步下降。

Lv10：
- 重型穿甲弹
- 反器材爆芯
- 弱点测距

### β 精密亚音速
高暴击、高爆伤，对满血目标额外暴击概率。

Lv10：
- 第一发处决
- 弱点识别
- 冷枪

### γ 半自动连狙
大幅加攻速、降低单发、取消基础穿透。

Lv10：
- 快速复位
- 双击
- 标记射击

---

## 11. 自动榴弹炮

定位：中距离持续 AOE。

基础：
- 高抛物线
- 真实飞行时间
- 预判落点
- 普通榴弹可能打空
- 不对空

### α 温压弹
扩大爆炸并施加 Slow。

Lv10：
- 冲击波
- 真空效应
- 高压燃爆

### β 弹跳榴弹
落地后额外弹跳并重复爆炸。

Lv10：
- 高弹性弹体
- 随机跳弹
- 终末爆炸

### γ 烟雾协议
直接伤害显著下降，烟雾区域降低敌人攻击速度。

Lv10：
- 浓烟
- 迟滞剂
- 战术遮断

---

## 12. 电击枪塔 Tesla Coil

定位：短距离连锁控制 / Combo 发动机。

基础：
- 每 2 秒放电
- 连锁 3 目标
- 低伤害
- Stun 0.3 秒
- 不对空

### α 高压电网
强化伤害、射程和控制。

Lv10：
- 高压脉冲
- 神经干扰
- 电荷残留

首批进化：电弧发生器。

### β 接地放电
取消连锁，改为自身周围圆形 AOE。

Lv10：
- 扩大接地
- 脉冲震荡
- 残余电场

### γ 超导线圈
大幅提高攻击频率并允许暴击，单次控制下降。

Lv10：
- 高速振荡
- 暴击放电
- 电荷积累

---

## 13. 后续常规武器池

已规划：
- 火焰喷射塔
- 迫击炮阵地
- 地雷布设器
- 高射机炮
- 反坦克炮
- 战术弩射平台
- 火箭发射巢

地雷属于正式武器，占武器槽。

---

## 14. 三选一系统

升级时战斗完全暂停。

玩家可：
- 选择 1 项
- 使用刷新
- 跳过

跳过获得局内战斗币。

升级池分为：

```text
WeaponUnlock
WeaponLevel
WeaponBranch
WeaponCore
GlobalStat
GlobalMechanic
Survival
Tradeoff
FutureSynergy
```

同一次三选一尽量减少三个同类别选项。

---

## 15. Build 标签

使用标签支持定向随机：

```text
#Projectile
#Critical
#AttackSpeed
#AOE
#Explosion
#Control
#Burn
#Lightning
#Magazine
#Reload
#HeavyHit
#Healing
#Survival
#Tradeoff
```

已有标签只小幅提高相关升级权重，避免系统强制配装。

---

## 16. 稀有度

四档：
- 普通
- 稀有
- 史诗
- 核心

核心升级主要负责 **改变玩法**，而不是简单数值翻倍。

---

## 17. Tradeoff

作为重要肉鸽内容。

示例：
- 玻璃大炮：伤害大幅提升，最大生命降低。
- 超频：攻速大幅提升，单发下降。
- 重型弹药：高伤低攻速。
- 极限核心：高暴击，但非暴击伤害下降。

---

## 18. Boss 商店

每 10 Wave Boss 后进入。

展示 5 件商品。

商品可包含：
- 回复基地 HP
- 新武器
- 武器升级
- 属性
- 机制
- 刷新次数
- 高价核心机制

允许刷新。

刷新价格在同一商店内指数上涨。

不免费回血；玩家需要决定“买输出还是保命”。

槽满后未来可在商店替换武器。

替换武器获得基于当前 Wave 的等级补偿，但旧武器专属路线与核心失效，必须明确提示。

---

## 19. Wave

所有难度均为无尽。

Wave 按固定时间推进，不等待当前怪物死亡。

核心失败压力：

```text
输出不足
→ 敌人未清完
→ 新 Wave 到来
→ 怪物积压
→ 基地周围敌人越来越多
→ 基地受到更高持续伤害
→ Build 崩溃
```

建议节奏：
- 每 5 Wave：精英
- 每 10 Wave：Boss + 商店
- 每 50 Wave：强化 Boss
- 每 100 Wave：里程碑

---

## 20. 五个难度

全部无尽。

上一难度达到 Wave 100 解锁下一难度。

- 难度 I：基础规则
- 难度 II：主要提升数值和敌人数
- 难度 III：精英词缀、新敌人、远程、自爆
- 难度 IV：更多词缀 + Boss 技能
- 难度 V：更多机制 + 多 Boss

---

## 21. V0.1 敌人

首批 6 种：

1. 步兵：标准单位
2. 突击兵：高速低血
3. 重甲兵：高 HP + 重甲
4. 蜂群单位：大量低血
5. 飞行单位：空军
6. 工兵：攻击武器

远程敌人：难度 III 开始。

自爆单位：难度 III 开始。

---

## 22. 空军

底层支持：

```text
GROUND
AIR
```

地面与空中使用独立路径。

飞行敌人 Wave 20 后出现。

V0.1 有效对空：
- 基础自动炮
- 轻机枪
- 狙击

不能正常对空：
- 霰弹
- 榴弹
- 电击

地雷默认不能打空军，但后续升级可突破。

### AntiAirProtection

若 Wave 15 左右玩家仍缺乏有效防空副武器：
- 提高轻机枪 / 狙击作为新武器候选的权重；
- Wave 20 前保证至少出现一次有效防空选择；
- 玩家仍可主动拒绝。

---

## 23. Armor

V0.1 正式实现。

普通敌人 Armor=0。

视觉分级：
- 无甲
- 轻甲
- 中甲
- 重甲

建议内部公式：

```text
DamageReduction = Armor / (Armor + K)
```

支持临时减甲。

火焰：
- 直接伤害受 Armor
- Burn DOT 无视 Armor

后续反坦克武器按照护甲等级获得额外倍率。

---

## 24. 状态系统

统一 StatusEffect：

```text
Burn
Poison
Slow
Freeze
Stun
ArmorBreak
...
```

统一字段：
- duration
- stack
- maxStack
- tick
- magnitude
- refreshRule
- sourceWeapon
- tags

Burn 可叠层，层数有限，新命中刷新持续时间。

Slow 可叠加，达到阈值进入 Freeze。

Boss 对硬控采用递增控制抗性，而不是完全免疫。

---

## 25. Combo

状态 Combo 是中后期核心，可跨武器触发。

V0.1 先做 3~5 个，首批建议 4 个：

### 爆燃
`Burn + Explosion`
- 立即结算部分 Burn
- 额外爆炸
- 消耗部分 Burn

### 震荡破甲
`Stun + HeavyHit`
- 临时降低 Armor

### 过载
`带电目标 + 再次 Lightning`
- 额外连锁

### 控制处决
`硬控目标 + Sniper Critical`
- 额外处决伤害

每种 Combo 独立定义是否消耗状态。

---

## 26. Projectile 性能策略

霰弹：
- 视觉显示多弹丸
- 实际锥形数学判定

火箭：
- 真实 Projectile
- 对象池

榴弹 / 迫击炮：
- 有真实飞行延迟
- 普通弹可能打空
- 制导分支基本必中

---

## 27. 弹匣 / Reload

正式核心机制。

字段：
```text
MagazineSize
CurrentAmmo
ReloadTime
```

Build 标签：
```text
#Magazine
#Reload
```

未来支持：
- 最后一发强化
- 空仓 Buff
- 快速装填
- 战术换弹
- 换弹触发

---

## 28. 武器耐久

每把武器独立 HP。

特殊敌人可能攻击武器：
- 工兵
- 自爆单位
- 轰炸空军
- Boss 技能

普通敌人只攻击基地。

Weapon HP <= 0：
- 武器瘫痪
- 停止攻击
- 不再成为目标
- 自动维修

Boss 商店可花战斗币立即维修。

武器防御主要由局外科技提供，不大量污染局内三选一。

---

## 29. 局外系统

### 局外等级
- Account Level
- 暂定最高 Lv100
- 结算获得 EXP
- 升级获得科技点

### 局外金币
用于普通永久科技。

### 科技点
用于核心科技和重要系统解锁。

### 科技树
建议分支：
- 火力
- 生存
- 成长
- 核心

免费洗点。

---

## 30. 游戏速度

默认 1×。

科技依次解锁：
- 2×
- 3×
- 4×

三选一和 Boss 商店完全暂停时间。

---

## 31. 离线收益

后续实现。

只获得：
- 局外金币
- 局外 EXP

不离线推进 Wave。

收益效率取决于：
- 历史最高难度
- 该难度最高 Wave

初始上限 2 小时，通过科技提高到 12 小时。

---

## 32. 未来科技进化

设计方向：

> 常规武器稳定、写实、上手简单；未来武器不稳定但上限更高。

进化应改变机制，而非纯加数值。

例如：
```text
普通 LMG
Magazine / Reload
↓
磁轨机枪
Heat / Energy / Overload
```

V0.1 实际验证 1~2 把未来进化：
- 轻机枪 → 磁轨加速机枪
- 电击塔 → 电弧发生器

进化系统建议在局外 Lv15~20 左右开放，具体后续测试。

正常第一次进化目标阶段：Wave 50~80。

---

## 33. Build 形成速度

目标：

> 开局约 5 分钟内必须明显形成 Build 方向。

前期应快速出现：
- 第二武器
- 武器路线倾向
- 明显机制
- 属性方向

不能长时间只有单纯 +10% 数值。

---

## 34. V0.1 升级卡池目标

下一阶段设计约 50 张三选一升级：

```text
10 全局基础属性
8  生存
8  Tradeoff
8  通用机制
10 武器专属核心
4  Combo相关
2  少武器Build
```

每张卡定义：

```text
id
name
description
rarity
maxLevel
tags
weight
requirements
conflicts
effect
shopAllowed
shopPriceMultiplier
```

---

## 35. 当前明确不做

V0.1 暂不做：
- 装备
- 英雄
- 手动技能
- 手动瞄准
- 摆塔
- PVP
- 联机
- 云存档
- 广告
- 商城
- 扫荡
- 离线推进 Wave
- 完整二次进化
- 大量未来科技武器

装备系统仅预留数据结构。

---

## 36. 技术方向

目标平台：
1. Web
2. Android

当前优先建议：
> Phaser + TypeScript

原因：
- Web 原生
- 适合 2D
- 易 PWA
- 后续可封装 Android
- 数据驱动方便
- 对象池和大量敌人优化较直接

Godot 4 保留为备选。

---

## 37. V0.1 成功标准

```text
自动战斗
→ 获得经验和战斗币
→ 三选一
→ 武器 / 属性 / 机制成长
→ Lv5 路线
→ Boss
→ 商店
→ 多武器 Build 成型
→ Combo
→ 敌人堆积
→ Build 极限
→ 死亡 / 主动结束
→ 结算
→ 局外科技永久强化
→ 再次挑战更高 Wave
```

V0.1 成功的关键不是内容量，而是：
- 每局 Build 明显不同；
- 5 分钟内出现方向感；
- 多武器互补成立；
- 状态 Combo 有价值；
- 死亡后永久成长有反馈；
- 玩家愿意立刻再开一局。

---

## 38. 下一阶段

下一步进入：

> **V0.1 局内升级卡池设计**

目标先完成约 50 张卡，再进入武器 / 敌人 / Wave 的数值模型和平衡模拟。

---

# 39. 战场方向与布局（新增锁定）

战斗方向正式确定为：

> **基地 / 炮塔位于屏幕底部，敌人从屏幕顶部向下推进。**

V0.1 采用纵向主战场。

```text
┌────────────────────────┐
│      Enemy Spawn       │
│      敌人出生区域       │
│  ↓   ↓   ↓   ↓   ↓    │
│                        │
│       战斗区域          │
│                        │
│       ↓ ↓ ↓            │
│                        │
│       ↓ ↓ ↓            │
│                        │
│     Weapon Range       │
│    ╱    │    ╲         │
│   W4   W1   W5         │
│    W2 BASE W3          │
└────────────────────────┘
```

五套武器围绕基地排布，但逻辑上仍是五套完全独立的攻击系统。

---

# 40. 逻辑战场坐标

内部统一使用逻辑坐标：

```text
Battlefield Width  = 1000
Battlefield Height = 1600
```

建议区域：

```text
Y = 50～120      敌人出生区域
Y = 120～1350    主战斗区域
Y ≈ 1380         敌人进入基地攻击区
Y ≈ 1480         基地 / 武器区域
```

所有实际屏幕只做缩放和 UI 重排，不改变战斗数值。

这样同一套逻辑可适配：

- Web 浏览器
- 手机竖屏
- 手机横屏
- 平板
- Android APK

---

# 41. 地面路线 V0.1

V0.1 逻辑上只有一条主 Ground Path，但使用多个横向视觉偏移轨，避免所有敌人重叠。

建议偏移：

```text
-160
-80
0
+80
+160
```

敌人从顶部随机进入不同偏移轨，越接近基地越向中心汇聚。

逻辑索敌不直接使用 Y，而使用：

```text
pathProgress
```

范围：

```text
0.0 = 刚出生
1.0 = 抵达基地
```

默认主炮优先攻击：

> **射程内 pathProgress 最大的合法目标。**

---

# 42. 空军路线补充

空军使用独立：

```text
AirPath
```

与 GroundPath 分离。

空军 Wave 20 后出现。

V0.1：
- 基础自动炮：可对空
- 轻机枪：可对空
- 狙击：可对空
- 霰弹：不可对空
- 榴弹：不可对空
- 电击：不可对空

地雷默认不能攻击空军，后续可通过升级突破。

---

# 43. M0.1 基础数值锁定

## Base

```text
MaxHP = 1000
DamageReduction = 0%
Regen = 0
```

## 基础自动炮 Lv1

| 属性 | 数值 |
|---|---:|
| Damage | 18 |
| AttackInterval | 0.50 s |
| RPM | 120 |
| Range | 720 |
| ProjectileSpeed | 900 |
| Magazine | 12 |
| Reload | 1.6 s |
| CritChance | 5% |
| CritDamage | ×2.0 |
| Pierce | 0 |
| AOE | 0 |
| Ground | Yes |
| Air | Yes |

第一版射界以底部向上约 160° 扇区为主。

---

# 44. M0.1 第一批敌人数值

## Infantry

```text
HP             80
Armor          0
MoveSpeed      52
AttackDamage   12
AttackInterval 1.2 s
SpawnCost      1.0
EXP            5
Credits        2
```

## Assault

```text
HP             55
Armor          0
MoveSpeed      75
AttackDamage   10
AttackInterval 1.0 s
SpawnCost      1.0
EXP            6
Credits        2
```

## Swarm

```text
HP             25
Armor          0
MoveSpeed      60
AttackDamage   4
AttackInterval 0.8 s
SpawnCost      0.35
EXP            2
Credits        1
```

## Heavy

```text
HP             220
Armor          100
ArmorClass     HEAVY
MoveSpeed      36
AttackDamage   22
AttackInterval 1.5 s
SpawnCost      2.5
EXP            14
Credits        6
```

---

# 45. Wave 1～9 标准测试表

开发阶段先使用固定刷怪表，避免随机性干扰基础战斗验证。

| Wave | 敌人 |
|---:|---|
| 1 | 8 Infantry |
| 2 | 9 Infantry |
| 3 | 11 Infantry |
| 4 | 13 Infantry |
| 5 | 15 Infantry |
| 6 | 17 Infantry |
| 7 | 19 Infantry |
| 8 | 21 Infantry |
| 9 | 24 Infantry |

M0.1 暂时只使用 Infantry，后续版本再依次加入 Assault / Heavy / Swarm。

普通 Wave：

```text
总时长 = 30 秒
0～24 秒：持续 Spawn
24～30 秒：停止本波 Spawn
30 秒：下一 Wave 立即开始
```

Wave 之间：

> **绝不自动清除残余敌人。**

残怪会继续与下一 Wave 叠加，这是核心压力来源。

---

# 46. Wave 10 Boss Gate

每 10 Wave 使用 Boss Gate。

普通 Wave：

> 固定时间推进，可堆怪。

Boss Wave：

```text
Wave 10
↓
停止普通 Wave 时间推进
↓
生成 Boss
↓
必须击杀 Boss
↓
清理残余普通敌人
↓
Boss 奖励
↓
Boss 商店
↓
Wave 11
```

V0.1 第一个 Boss：

## Armored Assault Vehicle

```text
HP             1800
Armor          20
ArmorClass     LIGHT
MoveSpeed      50
AttackDamage   32
AttackInterval 1.5 s
EXP            100
Credits        100
```

目标健康击杀时间：

> **约 15～25 秒。**

V0.1 不做 Boss 狂暴计时。

---

# 47. Wave 5 / Elite 规则修正

Difficulty I～II：

> 每 5 Wave 为 Reinforced Wave（强化波）。

只有简单数值强化，不带复杂词缀。

Difficulty III+：

> 每 5 Wave 才正式进入 Elite Affix 系统。

这样不会与“精英词缀从难度 III 才出现”的既定规则冲突。

---

# 48. EXP 节奏 V1

第一版：

```text
XPToNextLevel
=
45 + 15 × (CurrentLevel - 1)
```

目标节奏：

| Wave | 目标 Run Level |
|---:|---:|
| 5 | Lv4～5 |
| 10 | Lv7～9 |
| 20 | Lv14～18 |
| 40 | Lv26～32 |
| 60 | Lv38～46 |
| 80 | Lv48～58 |
| 100 | Lv58～70 |

EXP 与战斗币击杀后自动获得，不生成需要拾取的经验球。

---

# 49. Boss 商店首轮测试价格

| 商品 | 基础价格 |
|---|---:|
| 回复 25% Base HP | 80 |
| 维修一把武器 | 60 |
| 普通属性升级 | 100 |
| 稀有属性 | 150 |
| 已有武器 +1 Lv | 160 |
| 新武器 | 220 |
| 机制升级 | 220 |
| 史诗机制 | 300 |
| 核心机制 | 450 |

刷新价格：

```text
60
120
240
480
```

公式：

```text
RefreshCost = 60 × 2^RefreshCount
```

进入下一 Boss 商店后 RefreshCount 重置。

---

# 50. DamageSystem 第一版

统一伤害流程：

```text
RawDamage
=
WeaponDamage
× GlobalDamage
× WeaponModifiers
× TargetModifiers
```

之后处理：

```text
Critical
↓
Armor
↓
FinalDamage
```

Armor：

```text
DamageReduction = Armor / (Armor + 100)
```

用于 V0.1 第一版测试。

---

# 51. M0.1 技术栈

正式采用：

```text
Phaser
+ TypeScript
+ Vite
```

发行路径：

```text
Web 浏览器
↓
PWA
↓
稳定后使用 Capacitor 封装 Android APK
```

原则：

> **一套游戏代码，同时支持 Web 与 Android APK。**

不维护两套战斗逻辑。

---

# 52. M0.1 战斗对象结构

```text
CombatScene
│
├─ Base
│
├─ WeaponManager
│   └─ WeaponSlot[5]
│       └─ Weapon
│
├─ EnemyManager
│   └─ Enemy[]
│
├─ ProjectileManager
│   └─ ProjectilePool
│
├─ WaveManager
├─ TargetingSystem
├─ DamageSystem
└─ CombatStats
```

即使 M0.1 只实现 Slot 1，也必须从第一天使用 WeaponSlot[5] 结构，避免后续五武器系统重构。

---

# 53. Weapon 状态机

基础自动炮至少实现：

```text
IDLE
↓
TARGETING
↓
FIRING
↓
COOLDOWN
↓
EMPTY
↓
RELOADING
↓
TARGETING
```

核心字段：

```text
ammo
magazineSize
reloadTimer
attackTimer
targetId
```

这样后续 Reload / Magazine Build 可以直接建立在同一个底层机制上。

---

# 54. Projectile 规则

第一版就使用对象池。

```text
ProjectilePool
```

Projectile 保存目标 ID，并朝目标当前位置移动。

目标死亡时：

- 不自动寻找新目标；
- 按最后方向继续短暂飞行；
- 然后回收。

只有未来 Homing 类武器允许重新锁定。

---

# 55. M0.1 UI

第一版只要求：

```text
Wave
Enemy Count
Base HP
Ammo
Game Speed
```

开发阶段额外显示：

```text
FPS
Active Enemies
Active Projectiles
DPS
```

正式版本再隐藏 Debug 信息。

---

# 56. 游戏速度底层支持

底层从第一版直接支持：

```text
1×
2×
3×
4×
```

正式玩家通过科技逐步解锁。

开发测试可以直接切换。

性能目标：

> **4× Speed + 300 Active Enemies 仍保持可玩。**

---

# 57. M0.1 验收标准

M0.1 不以美术为重点，只验证：

## 压迫感
敌人从顶部不断向底部推进，危险逐渐逼近。

## 堆怪
DPS 不足时残怪与新 Wave 叠加，而不是自动清场。

## 基地死亡过程
应经历：
```text
开始漏怪
→ 少量受击
→ 敌人积压
→ HP 持续下降
→ 防线崩溃
```

而不是突然无预警死亡。

## 性能
```text
300 Active Enemies
+
4× Speed
```
Web 仍然可玩。

---

# 58. 原型开发里程碑

```text
M0.1
基础战斗
│
▼
M0.2
Run EXP + 三选一 + LMG
│
▼
M0.3
5 种随机武器
│
▼
M0.4
Lv5 / Lv10 武器路线
│
▼
M0.5
Armor + 重甲
│
▼
M0.6
Air + 防空
│
▼
M0.7
Status + Combo
│
▼
M0.8
Boss Shop
│
▼
M0.9
结算 + 科技树 + Save
│
▼
V0.1
完整 Web 可玩版
│
▼
Android APK
```

---

# 59. 当前下一步

设计阶段暂时停止继续扩张新机制。

下一步正式进入：

> **M0.1 Web 原型开发**

第一版实现范围：

```text
1000×1600 逻辑战场
↓
Enemy 顶部出生
↓
向底部 Base 推进
↓
底部 Auto Cannon 自动索敌
↓
炮塔旋转
↓
Projectile 对象池
↓
DamageSystem
↓
Enemy 抵达后攻击 Base
↓
30 秒 Wave
↓
Wave 残怪堆积
↓
Wave 10 Boss Gate
↓
胜利 / Base Destroyed
```

完成 M0.1 后，再根据真实运行手感调整：

- Wave 时长；
- Enemy MoveSpeed；
- Spawn 数量；
- 主炮 DPS；
- Base HP；
- Boss HP。
