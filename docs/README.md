# Rogue Defense 设计文档索引

## 当前里程碑

- [`m0.9-design.md`](m0.9-design.md)：Settlement、Account Lv、Gold / Tech Point、Tech Tree、Difficulty 与 Versioned Local Save。
- [`m0.9-validation.md`](m0.9-validation.md)：M0.9 自动构建、结算、存档、局外科技、难度和完整闭环验证清单。
- [`m0.8-design.md`](m0.8-design.md)：Boss Checkpoint Shop、5 格商品、刷新经济、武器耐久、满槽替换与 Reroll Charge。
- [`m0.8-validation.md`](m0.8-validation.md)：M0.8 验证记录。
- [`m0.7-design.md`](m0.7-design.md)：统一 StatusEffectSystem、Boss Hard Control Resistance、首批 4 个 Combo 与三选一卡池接入。
- [`m0.7-validation.md`](m0.7-validation.md)：M0.7 验证记录。
- [`m0.6-design.md`](m0.6-design.md)：TargetDomain、AirPath、Recon Drone、Wave 20 空中护航与防空随机保护。
- [`m0.6-validation.md`](m0.6-validation.md)：M0.6 验证记录。
- [`m0.5-design.md`](m0.5-design.md)：Armor Grade、Heavy Enemy、ArmorSystem、穿甲路线与 ArmorBreak 接口。
- [`m0.5-validation.md`](m0.5-validation.md)：M0.5 验证记录。
- [`m0.4-design.md`](m0.4-design.md)：所有 6 把武器 Lv1～10、Lv5 α/β/γ 路线、Lv10 路线专精与 BranchEffect 实现规格。
- [`m0.4-validation.md`](m0.4-validation.md)：M0.4 验证记录。
- [`m0.3-design.md`](m0.3-design.md)：五种随机武器基础形态、攻击模式、索敌规则与随机武器保底。
- [`m0.3-validation.md`](m0.3-validation.md)：M0.3 验证清单。
- [`m0.2-design.md`](m0.2-design.md)：Run EXP、三选一、Skip Credits 与首把 LMG 的 M0.2 实现规格。
- [`m0.2-validation.md`](m0.2-validation.md)：M0.2 验证记录。
- [`m0.1-validation.md`](m0.1-validation.md)：M0.1 基线验证记录。

## 核心文档

- [`game-design-v0.2.md`](game-design-v0.2.md)：当前游戏系统总稿，包含核心循环、武器、敌人、状态、Combo、难度、局外成长和纵向战场规格。
- [`upgrade-card-pool-v0.1.md`](upgrade-card-pool-v0.1.md)：首批约 50 张局内升级卡候选池，数值仍属于原型平衡值。
- [`upgrade-director-v1.md`](upgrade-director-v1.md)：三选一候选生成、阶段权重、标签定向、随机保护、进化 Pity 与刷新规则。
- [`decision-log.md`](decision-log.md)：关键设计和技术决策记录。

## 文档维护规则

- 已确认的系统级决策进入总稿或专项文档。
- 具体数值在原型测试前视为可调参数，不与机制规则混为一谈。
- 每个里程碑完成后更新 `decision-log.md`。
- 大型专项系统优先拆分独立文档，避免总稿无限膨胀。
- M0.9 之后不再扩主要系统，优先处理 V0.1 Integration / Playtest / Balance / Performance。
