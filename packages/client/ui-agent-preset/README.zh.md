---
description: "Web GUI 的 agent（智能体） preset 界面：选择器可见性与默认设置、新建会话 chip、会话标题标签与 preset 名单管理分区；供 agent 组装的用户与维护者阅读。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-agent-preset

[English](README.md) | 中文

## 概述

使用本包可以为新的 Web GUI 会话选择 agent preset、管理对话专家，并检查局部专家提示词优化。通用设置中的代码工作工具控制模式选择器的显示，不会改变运行中或历史会话。专家复用 preset 组装，并增加欢迎语、提示词编辑器、版本记录，以及一个先展示子 Agent 运行、再在右侧栏打开可编辑左右对比的助手消息操作。如果部署未提供任何 preset，模式控件保持隐藏，每个会话都使用宿主组装。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

与设置和对话包一起挂载本插件；管理分区随后显示 preset 名单。

关闭通用设置中的代码工作工具后，新会话选择器和设置页列表提供标准、创造和自定义预设；开启后还提供 PTC 和极简模式。两种状态下均保留默认值选择和创造入口。选择健康定义作为默认值也会同步当前新任务页面的空白会话。Creator 入口开启一个使用 `cordis` preset 的新任务。

关闭代码工作工具时，沿用现有 Developer tools 订阅清空所有尚未应用的选择。关闭状态被接受后，使用 Host 持久化设置的连接会将已保存的内置 PTC 或极简默认值回退为标准模式。已保存的标准、创造和自定义默认值（包括有名称的 PTC 或极简覆盖项）保持不变。关闭后用户仍可重新选择可用预设。已有会话保留所选模式；新会话使用当前默认值。即使已有会话的模式不在菜单中，其标签仍会显示。重新开启代码工作工具不会恢复原默认值或已清除的选择。使用内存设置的远程连接不会改写 Host 的默认值。标准模式缺失或损坏时，默认值保持不变，并显示错误。

随附名单包含 `standard`、`ptc`、`minimal`、`cordis` 与 `chat`。`chat` preset 保留普通 Session 记录与模型路由，使用标准模式的 shell 与文件系统工具读取上传文件，同时不加载 Skills、项目指令、运行时上下文及压缩。

### 管理名单

设置分区把名单呈现为两组卡片：先是随附 preset，再是本部署自己声明的那些。每张卡片带有该 preset 的展示文案、它的 id 与标明其状态的徽标；损坏的 preset 还会把宿主给出的原因附在徽标上、工具提示里，以及一个被禁用的卡片主体无法提供的 alert 中。随附文案认识的条目还会提供"模式说明"与"使用方式"，打开该 preset 的策展指引。选择健康且非默认的卡片会为后续会话写入新的用户默认值；如果当前新任务页已经复用一个空白会话，这次在设置中的明确选择也会通过既有选择链路把同一 preset 带到这个精确的空白会话。已开始及历史会话保持不变。策略写入进行中卡片会被禁用；写入失败时，界面保留先前的偏好并显示错误。损坏的 preset 完全无法被选中。

读取声明是这个页面在"选择"之外提供的唯一能力：每张卡片都保留一个查看动作，在只读对话框中把该 preset 声明的子插件列表以 YAML 呈现；损坏的 preset 同样可读，因为那份声明正是其诊断所指之处。当部署组装了草稿所需的对话流程时，自定义分组末尾会出现 Creator 模式入口，它上台自引用的 `cordis` preset 并开始一个新任务。

### 对话式入口

名单携带自指的 `cordis` preset 时，其虚线添加卡会暂存 `cordis` 并启动新会话——分区关闭设置面板，新建会话 chip 自己的应用器负责组装工作区流程产出的空白会话。

### 专家

编辑器的加号菜单会打开可搜索的专家选择器。「专家列表」固定排在首项，「新增专家」固定紧随其后，再排列所有专家。专家绝不会出现在 Agent preset 选择器或设置名单里。每个专家行把版本放在名字旁边，把编辑固定在最右侧，并在 hover 或键盘 focus 时显示；触屏布局始终显示编辑。选择专家会把受管的聊天组装应用到当前空白 Session，不会把提示词显示成用户消息。空白对话会显示专家欢迎语，提示第一句话。「专家列表」、「新增专家」与编辑会用所选管理页面替换已打开的优化结果；专家列表页也提供「新增专家」。新增专家时，系统会自动分配一个不显示的稳定标识符。新增与编辑会在右侧栏显示图标（可选）、名字、欢迎语、提示词和版本记录字段。编辑内容未变化时，「保存专家」保持禁用；任一字段变化后可以保存，保存期间字段会被锁定，成功后禁用操作会显示「已保存」，直到再次编辑。保存修改后的提示词会在当前 Session 使用该专家时应用新版本，其他已打开 Session 保持各自安装的提示词。选择某条版本记录会用同一个左右高亮界面只读查看该版与上一版提示词；修改名字、图标或欢迎语会持久化，但不会生成版本记录。

专家 Session 中每条已完成的助手消息都带有“优化专家提示词”操作。该操作会立即展开右侧栏，并复用普通对话视图展示子 Agent 的上下文、精简中文任务、思考、skill 加载与工具，但不显示输入框。完整专家提示词和对话证据使用既有的折叠“上下文注入”行，不再显示成用户气泡。思考使用普通的折叠项与实时单行摘要。最终候选稿通过既有结构化输出工具提交，不会在助手正文中打印 JSON。启动和运行期间，标题栏最右侧始终显示“停止优化提示词”按钮；它会中断启动或释放已发布的子 Agent。有修改的候选稿会左右完整显示当前与建议提示词，用词级高亮标出差异并列出中文修改依据。建议提示词可以直接编辑，差异高亮会在确认前重新计算；没有修改的候选稿会说明原因。“保留当前版本”会丢弃候选稿；只有“确认新版本”会写入文件。

-----

插件页**添加插件**箭头菜单中的**让 Agent 创建插件**进入与设置页相同的创造流程，不发送消息，并保留未发送的草稿。读取预设列表或创造模式不可用时，菜单项禁用并说明原因。Host 拒绝切换预设时，两处入口均通过 Toast 显示原因。

进入创造模式会为接收该选择的空白 Session 选择 `cordis`，不改变新任务默认值或代码工作工具设置。尚未绑定工作区或空白 Session 时，选择等待绑定完成后应用。应用后，创造 Session 保留该预设；之后真正创建的新 Session 使用配置的默认值，例如标准模式。

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

设置分区通过现有的 `settings.update` 写入宿主的 `agent-preset-registry` 命名空间，设为默认动作写入 `selectedDefault`。写入之后，由宿主名单给出当前生效的默认值，再由 chip controller 的 `agentPresets/select` 链路把它带到同一个仍为空白的会话；专家选择复用同一条受保护路径。`agentPresets/list` 提供名单并标记当前默认值，`agentPresets/read` 为查看器提供一条声明的 YAML；选择器、空白会话同步和只读会话标签使用记录的 preset 标识。专家管理则使用 typed 专家端点和一个共享浏览器 store。专家 store 按 Session 保存优化状态，因此两个打开的对话不会交换候选稿。优化期间，store 以 `controllerOperation` 保留观察到的那一代子级 Session，而不改变当前选中的主 Session；renderer 注入的 `FixedSessionSlotView` 再把既有对话槽位绑定到该保留引用，一旦离开运行状态就释放。既有指令菜单负责专家搜索与选择，右侧栏负责管理与检查。[`dsh-client-connection`](../connection/README.zh.md) 使用同一浏览器会话认证全部这些宿主方法。分区在自身操作、`settings/document-updated` 与 `connection/reset` 时重读。

`CreatePluginMenuItem` 使用共享的预设列表 store，向 `plugins.add.actions` 贡献菜单项。选择时先调用页面传入的 `onDismiss()`，再调用与设置页 `creatorDraft` 相同的 `startCreatorDraft` 回调。该回调通过 `AgentPresetSeatController` 暂存 `cordis`，再通过显式保留草稿的 `uiWorkspace.startSession` 调用打开任务；它可以复用空白 Session，并在 Session 绑定可用时应用暂存选择。暂存选择应用后即清除。代码工作工具开启或关闭时均使用同一个选择器和选择 store，`AgentPresetSeat` 通过共享的 `Toast` 组件显示拒绝原因。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

当 preset 界面无法满足需求时，请阅读以下页面。它们从浏览器界面延伸至 preset 领域与组装模型。

- [dsh-agent-preset-registry](../../preset/agent-preset-registry/README.zh.md)——这些界面读取的宿主注册表与组装。
- [ui-conversation](../ui-conversation/README.zh.md)——声明 chip 与标签填充的首屏与会话头部槽位。
- [ui-settings](../ui-settings/README.zh.md)——承载名单分区的设置外壳。
- [客户端包映射](../README.zh.md)——相邻的浏览器 UI 包。

-----

<a id="model-experience"></a>
## 模型体验

间接地，通过所选 preset 和 [`dsh-agent-preset-registry`](../../preset/agent-preset-registry/README.zh.md) 所记录的一次性子 Agent 影响模型；进度与对比渲染自身不会增加任何模型可见内容。

#### KV Cache 影响

修改选择器可见性、默认值、未保存的编辑器字段或未确认候选稿，不会改变运行中 Session 的前缀。保存修改后的专家提示词或确认优化，只会通过 Host 工作流改变目标 Session 的后续请求；普通分支使用专家当前版本。每个已应用版本都会从新前缀重新开始复用。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>


这些限制界定了当前 preset 界面。它们是当前包约束，不是通用组装对比或任务积压。

- **未发布元数据的 preset 按 id 列出**——展示文本是可选的，因此什么都没命名的声明刻意回退到它的 id，而不是与其来源呈现得一模一样。解析本身使用 [`dsh-agent-preset-registry/display`](../../preset/agent-preset-registry/README.zh.md) 共享的 `presetDisplayText` 解析逻辑，设置的插件列表把它内联在本插件的字典之上，按当前语言显示随附 preset 的名称，同时不翻译用户自建的元数据。
- **这个页面是读者，不是作者**——浏览器不组装任何 preset：它选择默认值、切换选择器可见性、读取声明。编写发生在浏览器之外的组装文件里，因此名单只在本页自身操作、`settings/document-updated` 与 `connection/reset` 时重读，协议链路也不会广播磁盘编辑。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>

**运行时不变式：** 不发布伴生入口。这是浏览器侧界面插件，Node 侧不拥有事件流或可变运行时数据；名单与设置写入属于宿主约定。
