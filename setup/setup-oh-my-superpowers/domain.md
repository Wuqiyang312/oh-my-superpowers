# 领域文档

工程技能在探索代码库时应该如何消费该仓库的领域文档。

## 探索之前，先阅读这些

- 仓库根目录的 **`CONTEXT.md`**，或
- 如果存在，仓库根目录的 **`CONTEXT-MAP.md`** —— 它指向每个上下文的一个 `CONTEXT.md`。阅读与主题相关的每一个。
- **`docs/adr/`** —— 阅读触及你将要工作领域的 ADR。在多上下文仓库中，还要检查 `src/<context>/docs/adr/` 中上下文特定的决策。

如果这些文件不存在，**静默继续**。不要标记它们不存在；不要建议预先创建它们。生产者技能（`/grill-with-docs`）会在术语或决策实际解决时惰性创建它们。

## 文件结构

单上下文仓库（大多数仓库）：

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

多上下文仓库（根目录存在 `CONTEXT-MAP.md`）：

```
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← 全系统决策
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← 上下文特定决策
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

## 使用词汇表的术语

当你的输出命名领域概念时（在 issue 标题、重构提议、假设、测试名中），使用 `CONTEXT.md` 中定义的术语。不要滑向词汇表明确避免的同义词。

如果你需要的概念尚不在词汇表中，这是一个信号——要么你在发明项目不使用的语言（请重新考虑），要么存在一个真正的缺口（记录给 `/grill-with-docs`）。

## 标记 ADR 冲突

如果你的输出与现有 ADR 矛盾，请明确展示出来，而不是默默覆盖：

> _与 ADR-0007（event-sourced orders）矛盾 —— 但值得重新打开，因为…_
