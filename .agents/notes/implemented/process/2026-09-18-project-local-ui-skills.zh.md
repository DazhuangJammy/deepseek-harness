# Agent Note: 项目本地 UI skill

Status: implemented

[English](2026-09-18-project-local-ui-skills.md) | 中文

## 问题

只安装在某位开发者 Codex 主目录中的 UI 设计指令不会出现在其他 checkout 或 DeepSeek Harness 会话中。仓库需要一组可复现的 skill，同时无需用插件承载不含可执行行为的内容。

## 决策

仓库在 `.agents/skills` 下保存六个项目本地 skill，由 `dsh-skill-filesystem` 直接发现目录包。静态指令包不使用 Cordis 插件包装层。

- [`frontend-design`](../../../skills/frontend-design/SKILL.md) 跟随 `anthropics/skills` 中的 `skills/frontend-design`。
- [`emil-design-eng`](../../../skills/emil-design-eng/SKILL.md) 跟随 `emilkowalski/skill` 中的 `skills/emil-design-eng`。
- [`taste-skill`](../../../skills/taste-skill/SKILL.md) 跟随 `leonxlnx/taste-skill` 当前默认的 `skills/taste-skill` 目录包；该 skill 自身的描述把适用范围限制在落地页、作品集和重新设计，不适用于产品 dashboard。
- [`better-icons`](../../../skills/better-icons/SKILL.md) 跟随 `better-auth/better-icons` 中的 `skills/SKILL.md`。
- [`baseline-ui`](../../../skills/baseline-ui/SKILL.md) 保留已接受的本地指令文件。仓库不为这份本地改编声明上游来源或许可证。
- [`dazhuangskill-creator`](../../../skills/dazhuangskill-creator/SKILL.md) 跟随 `DazhuangJammy/DazhuangSkill-Creator`，包含指令文件、版本、许可证、配置、agents、模板、参考资料、运行时脚本和评估查看器。

每个由外部维护的目录包都在指令文件旁保留上游许可证。更新上游内容时，经过评审后同时替换相关指令和许可证文件。项目副本不包含嵌套 Git 元数据，也不会通过拉取另一个仓库来自行更新。

creator 目录包排除仓库元数据、缓存、测试专用脚本、开发笔记和历史评估输出。保留的文件包含 creator 工作流调用的所有仓库自有支持文件；模板中提到的 memory 状态和 guard 文件会在目标 skill 目录内生成。

## 曾考虑的替代方案

**为每个 skill 包装 Cordis 插件。**文件系统提供方已经能够发现项目目录包，因此包装层只会增加 manifest 和激活代码，不会提供另一项能力。

**依赖用户全局 skill 目录。**全局安装因机器而异，无法仅凭 checkout 复现 skill 目录。

**嵌入完整上游仓库。**嵌套 Git 元数据、上游测试和历史报告不参与 skill 执行，只会增加评审和更新规模。

## 后果

使用标准 preset 的会话可以从项目 checkout 中发现这六个 skill。各自的 frontmatter 描述继续限定调用范围，因此存在重叠的设计 skill 保留上游各自的适用范围，而不会合并成一个指令文件。

四个由上游支持的 UI skill 可能落后于其来源，需要有意更新。`baseline-ui` 仍是仓库维护的本地副本，其外部来源尚未核实。creator 的更新检查器可以报告新版本，但 vendored 副本不能自动更新父仓库。

仓库检查会解析 skill frontmatter、通过文件系统提供方加载每份新增指令、验证调用元数据，并检查双语决策记录。creator 的严格自检目前会把自身的 memory 编写指导误判成已经启用的 memory 状态，因此该检查不能作为 vendored creator 本身的完成证据。更新上游快照时，需要运行仓库检查，并在采纳前评审已变化的指令。
