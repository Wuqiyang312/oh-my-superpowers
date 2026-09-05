---
name: using-oh-my-superpowers-chinese
description: 中文项目和中文对话的 Oh My Superpowers 路由优化。在用户使用中文沟通、仓库面向中文团队、涉及 Gitee/Coding/极狐 GitLab/CNB、中文代码审查、中文文档、中文 commit、中文 PRD、需求、工单、缺陷、排查、评审、提测、发版、交接或国内团队工作流时使用；用于判断实际应该继续加载哪个通用技能或中文专项技能。
---

# 中文场景技能路由

先遵循 `using-oh-my-superpowers` 的通用规则，再应用本技能的中文语境判断。不要把中文请求简单当作文案任务；判断用户真正要完成的是设计、计划、执行、排查、评审、文档、提交、工单还是工作流配置。

## 路由原则

1. 用户用中文沟通时，默认用中文回应，除非用户要求英文或项目规范要求英文。
2. 中文专项技能用于补充语气、规范和平台差异；通用工程技能仍负责核心流程。
3. 当中文专项技能和通用技能都适用时，先加载通用技能处理任务，再加载中文专项技能校准表达或平台规则。
4. 国内 Git 平台、中文团队协作和中文交付物是强信号，不要等用户显式点名专项技能。

## 中文请求到技能

| 用户真实意图或中文说法 | 应使用的技能 |
|------|------|
| “帮我想清楚需求”、“梳理领域术语”、“写设计概要”、“补 ADR” | `grill-with-docs` |
| “多问我几个问题”、“拷问这个方案”、“挑战一下设计” | `grill-me` |
| “写执行计划”、“拆步骤”、“排期实现方案” | `writing-plans` |
| “按计划做完”、“实现这个方案”、“多任务并行推进” | `executing-plans` |
| “修 bug”、“排查问题”、“定位原因”、“为什么挂了”、“线上故障” | `diagnose` |
| “先写测试”、“用 TDD”、“补测试再改” | `test-driven-development` |
| “做 PRD”、“整理产品需求文档”、“把聊天变成需求文档” | `to-prd` + `chinese-documentation` |
| “拆工单”、“拆 issue”、“拆缺陷/任务”、“放到需求池” | `to-issues` |
| “代码审查”、“帮我 review”、“审 MR/PR”、“给同事反馈” | `requesting-code-review` + `chinese-code-review` |
| “处理 review 意见”、“根据评审意见修改” | `receiving-code-review` + `chinese-code-review` |
| “写 README”、“写接口文档”、“润色中文文档”、“去机翻味” | `chinese-documentation` |
| “写 commit”、“规范提交信息”、“生成 changelog” | `chinese-commit-conventions` |
| “用 Gitee/Coding/极狐 GitLab/CNB”、“国内 Git 平台”、“镜像同步”、“中文 PR/MR 模板” | `chinese-git-workflow` |
| “帮我和用户聊”、“客户对接”、“需求确认话术”、“进展同步文案”、“验收怎么说” | `user-dialogue-templates` + `chinese-documentation` |
| “收尾分支”、“准备合并”、“发版前整理” | `finishing-a-development-branch` + `chinese-git-workflow` |
| “开 worktree”、“多分支并行开发” | `using-git-worktrees` |
| “交接给别人”、“写交接文档”、“让下个 agent 接手” | `handoff` + `chinese-documentation` |
| “架构有点乱”、“整体看看”、“模块边界怎么拆” | `zoom-out` 或 `improve-codebase-architecture` |
| “创建/优化一个 skill”、“中文化这个 skill” | `writing-skills` + `chinese-documentation` |

## 国内平台识别

看到以下词汇时，优先考虑 `chinese-git-workflow`：

- Gitee、码云、Coding、腾讯云开发者平台
- 极狐 GitLab、JihuLab、企业 GitLab
- CNB、cnb.cool
- 禅道、TAPD、ONES、飞书项目、企业微信、钉钉
- “提测”、“发版”、“灰度”、“需求池”、“缺陷单”、“迭代”

如果用户只是要求实现代码，不要让平台规则喧宾夺主；平台技能只用于分支、提交、PR/MR、issue、CI/CD 和协作细节。

## 输出风格

- 面向中文团队：语气直接但留有余地，关键问题明确标级。
- 技术名词：Redis、API、PR、MR、CI/CD 等常见术语保留英文。
- 中文文档：中英文之间加空格，避免机翻腔和过长句。
- 审查意见：使用 `[必须修复]`、`[建议修改]`、`[仅供参考]`、`[问题]` 分级。
