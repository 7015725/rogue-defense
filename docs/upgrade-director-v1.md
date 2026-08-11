# Upgrade Director V1

> 目标：让局内三选一保持随机，但避免结构性 RNG 直接判死。Director 不负责在玩家打不过时动态救场。

## 1. 候选生成流程

```text
Build Eligible Pool
↓
硬过滤无效候选
↓
Wave 阶段权重
↓
稀有度修正
↓
Build 标签轻度加权
↓
关键成长节点保护
↓
防空 / 进化等结构保护
↓
最近出现抑制
↓
抽候选 1
↓
同类别降权
↓
抽候选 2
↓
再次降权
↓
抽候选 3
```

硬过滤包括：

- 已达 `maxLevel` 的卡移除。
- 未拥有某武器时，不出现其专属核心。
- 已锁定 Lv5 路线后，不出现其他路线专属核心。
- 五武器槽已满时，普通升级池移除 WeaponUnlock；换武器只在商店进行。
- 进化系统未解锁时，不出现进化核心。
- 不满足前置或存在 Conflict 的卡移除。

## 2. 阶段依据

Director **以 Wave 为主**，Run Level 只作为辅助条件。

| 阶段 | Wave | 主要任务 |
|---|---:|---|
| 建立期 | 1–10 | 基础属性、第一批武器成长 |
| 成型期 | 11–20 | 新武器、Lv5 路线、Build 方向 |
| 专精期 | 21–40 | 武器等级、机制、Tradeoff |
| 联动期 | 41–60 | 专属核心、Combo、深度 Build |
| 极限期 | 61+ | 核心、进化、极端构筑 |

## 3. Pool 相对权重 V1

| Pool | W1-10 | W11-20 | W21-40 | W41-60 | W61+ |
|---|---:|---:|---:|---:|---:|
| WeaponUnlock | 25 | 25 | 12 | 6 | 3 |
| WeaponLevel | 30 | 28 | 26 | 20 | 14 |
| GlobalStat | 30 | 22 | 16 | 12 | 10 |
| Survival | 10 | 10 | 9 | 8 | 8 |
| GlobalMechanic | 5 | 10 | 15 | 16 | 16 |
| Tradeoff | 0 | 5 | 10 | 12 | 14 |
| WeaponCore | 0 | 0 | 7 | 14 | 16 |
| Combo | 0 | 0 | 5 | 8 | 10 |
| Evolution | 0 | 0 | 0 | 4 | 9 |

无合法候选的 Pool 权重自动重新分配。

## 4. 稀有度门槛 V1

```text
普通：Wave 1+
稀有：Wave 3+
史诗：Wave 10+
核心：Wave 20+
进化核心：Wave 50+
```

基础稀有度倍率可从以下原型值开始测试：

```text
普通 ×1.00
稀有 ×0.55
史诗 ×0.20
核心 ×0.06
```

局外科技 **不增加永久 Luck / 高稀有度概率**。局外科技主要提供刷新、经济、系统解锁和选择空间。

## 5. Build 标签定向随机

标签只做轻度引导：

```text
0 匹配       ×1.00
轻度匹配     ×1.12
中度匹配     ×1.25
高度匹配     ×1.40
普通上限     ×1.45
```

Director 根据玩家已经选择的内容形成 `buildTagScores`，不会预判玩家“应该玩什么”。

## 6. Build Intent

明确的核心卡可以视为玩家主动声明 Build 方向。

### MINIMAL_WEAPONS

通过“集中供能”等卡形成：

```text
WeaponUnlock ×0.35
现有 WeaponLevel ×1.20
WeaponCore ×1.25
GlobalStat ×1.10
```

但新武器不会被彻底禁止，玩家仍可改变方向。

### ARSENAL

通过多武器相关核心和已装备武器数量形成，轻度提高未拥有武器出现概率。

## 7. 三候选类别差异

同一次三选一尽量来自不同类别，但不是强制。

例如第一张为 `weapon_level` 后：

```text
第二张 weapon_level ×0.35
若第二张仍为 weapon_level：
第三张 weapon_level ×0.15
```

同一个 Upgrade ID 同屏绝对禁止重复。

## 8. 最近出现抑制

保存最近约 3 次 Offer：

```text
上一次出现但未选择 ×0.20
2 次前             ×0.50
3 次前             ×0.75
之后               ×1.00
```

WeaponLevel 类抑制应更弱，避免阻断武器正常成长。

Reroll 后，上一组三张获得额外强抑制，避免刷新后原样返回。

## 9. 结构保护

Director 只保护结构性问题，不根据实时战斗强弱救玩家。

### 新武器保护

- Wave 3+ 提高首把随机武器权重。
- 正常目标为 Wave 3–8 看到第二武器。
- Wave 20 前至少保证出现过一次新武器选择。

### AntiAirProtection

- Wave 15 左右检查有效防空能力。
- 若不足，提高 LMG / Sniper 等合法防空武器候选权重。
- Wave 20 前保证至少展示一次有效防空选择。
- 只保证出现，玩家可以拒绝。

### 关键等级节点

`Lv4→5`、`Lv9→10` 获得小幅权重提高（原型可从 ×1.15 开始测试）。

### Evolution Pity

满足完整进化条件后：

```text
Wave 50  基础权重
Wave 60  提高
Wave 70  明显提高
Wave 80  保证出现一次合法进化核心选项
```

Pity 只保证“出现选项”，不会自动给予。

## 10. 不进行动态救场

以下情况不会偷偷改变卡池：

- Base 低血量时不会提高生存卡概率。
- 当前 DPS 不足时不会自动提高伤害卡概率。
- 玩家拒绝防空后，系统不会强制塞防空。
- 玩家选择高风险 Tradeoff 后必须承担结果。

## 11. Boss 商店规则

- 每次商店 5 个商品。
- 至少保证 1 个后勤位：基地回血或武器维修。
- 后勤不是免费的。
- 同屏禁止完全相同商品。
- 五槽满后新武器替换只在商店发生。

## 12. Reroll / Skip

### Reroll

- 重新执行完整 Upgrade Director。
- 当前三张加入最近出现强抑制。
- 不改变 Wave、Build、Pity 和阶段。

### Skip

- 跳过三张获得局内战斗币。
- Skip 不被 Director 解读为玩家拒绝某个 Build 标签。

## 13. 最终权重模型

```text
FinalWeight =
BaseWeight
× StageModifier
× RarityModifier
× BuildAffinity
× ProgressModifier
× ProtectionModifier
× RecentOfferModifier
× ConflictModifier
```

普通 Build 引导应限制倍率，结构保护可使用更大的倍率；真正的保底则直接插入一个合法候选槽。

## 14. Run State

```text
UpgradeDirectorState {
  phase
  recentOffers[]
  offeredWeaponIds[]
  acquiredWeaponIds[]
  buildTagScores{}
  buildIntent
  firstWeaponProtection
  antiAirProtection
  evolutionPity{}
  upgradeOfferCount
  rerollCount
}
```

全部属于 Run Layer，本局结束清空。

## 15. 已锁定决策（186–200）

- Wave 为主要阶段依据。
- 永久科技不做 Luck。
- Lv5 / Lv10 关键节点有轻保护。
- 进化有 Pity，约 Wave 80 保证出现一次。
- 保底只保证选项，不自动给予。
- 启用最近出现抑制。
- 低血量不动态提高生存卡。
- Reroll 后降低上一组重复概率。
- 卡面显示 Build 标签。
- 可显示轻量“与当前 Build 联动”提示。
- Boss 商店保证一个后勤位。
- 商店禁止完全重复商品。
- 满级数值卡从池中移除。
- 五槽满后普通升级不再出现新武器。
- 允许极低概率出现合法但不高度匹配当前标签的惊喜核心。
