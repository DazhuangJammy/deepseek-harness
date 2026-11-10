---
description: "面向侧栏与首屏的可配置 DeepSeek Harness 品牌，以及默认首页点击浮出的像素鲸鱼。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-brand-official

[English](README.md) | 中文

## 概述

本包为产品提供可配置品牌，并提供默认的首页装饰。设置 → 插件会显示启用开关、名称、图标地址和本地图片上传；选定的图标会同时用于侧栏和新会话首屏。关闭或留空时，各界面保留自己的现有回退；`official` 客户端构建无需任何配置也保留随包发布的 DeepSeek Harness 侧栏图形。本包还在空白首页渲染点击浮出的像素鲸鱼。背景只持有临时 Canvas 资源。设置与装饰都不影响模型请求。

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

随产品提供的 Web 与 Desktop 组合已挂载本插件。首页反馈不需要额外安装或启用。

node 半部把品牌字段声明为自身的条目 Config，因此宿主设置文档负责持久化，完整 Web 客户端在运行时通过通用的配置表单读取它们。使用设置 → 插件 → 界面品牌可修改名称及侧栏/首屏共用图标、切换启用状态、上传图片或恢复默认。

### 选择 profile

`DSH_CLIENT_BUILD_PROFILE=official` 在没有任何已配置取值时也保留侧边栏中随包发布的标识与名称，这也是官方构建使用的 profile。其他取值下，每个品牌槽位都仍由其声明包负责，直到设置为该界面携带了取值；因此本地构建保留自己的标识、构建标签与版本号。没有配置表单的轻量宿主沿用历史上的 profile 门控；完整 Web 客户端始终具备该服务，可以配置品牌。

会话首屏在设置启用自定义图标之前显示来自 `dsh-client-ui-conversation` 的动画鱼形标志，启用后由其替换。各构建 profile 共用首页背景，两种情况下插件都会照常加载并通过校验。

### 首页反馈

默认首页保持留白，主按钮点击空白处才播放一次浅灰色鲸鱼跃起。每次播放结束后的点击在点阵与代码填充之间交替，首次为点阵；两种填充使用相同的大幅动态轮廓。动画持续 5.7 秒，随后清空。连续点击不会打断当前播放。点击由鲸鱼的 frame 层自己判定：外框内部的留白可触发播放，包括输入卡片两侧的空白；输入框、控件、输入卡片、portal 出去的浮层以及结束文字选择的点击都不触发。Canvas 不获取焦点或指针事件，点击由外框接收。窄屏首页中的鲸鱼保留较大比例，在 Canvas 边缘裁切，不增加横向滚动。减少动态效果偏好会禁用它，离开空白首页时释放动画与观察器。

鲸鱼使用非常浅的主题中性色，呈现轻微的背景隐纹；代码文字的对比度略高于点阵。水花保留细小颗粒并使用较深的颜色，尤其是入水时左侧的水花。随包帧图提供动作，首次符合条件的点击时由浏览器经插件 asset 路由加载一次。代码填充使用密排的 7px 文字，内容只来自预设的代码标语，出水与入水时文本随动态轮廓裁切。解码或像素读取失败时停止装饰，首页仍可正常使用，并在日志中提示重新加载。

鲸鱼的图形参数固定，不接受配置；品牌字段是其独立设置。这是内置呈现，没有需要单独安装的 Bundle 或插件页面开关。

### 替换品牌

自有身份的部署可以不组合本包，而是组合另一个占据侧栏 slot、首屏标志 slot 与 `conversation.hero.frame` 层的包。挂载本包后，可在设置 → 插件 → 界面品牌中修改名称及侧栏/首屏共用图标、切换启用状态、上传图片或恢复默认。占据 slot 是图形身份唯一的组合路径；鲸鱼的图形不可配置。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

两个侧栏填充作为一组声明感知的注册安装：嵌套的 `ctx.slots.inject()` 调用等待侧栏声明，因此无论本行在声明者之前还是之后激活，这组注册都能工作；声明消失时两个填充一并撤回，HMR 期间也不会留下残缺的品牌混合。独立的 `conversation.hero.frame` 层持有 Canvas 绘制器，通过 `ctx.slots.inject()` 等待声明；`hero` 为 true 时它以负 `z-index` 绘制 Canvas，按 frame 层约定画在 Conversation 背景之上、所有 Conversation 内容之下。它在点击落到自身外框、且不在控件和输入卡片上时播放；portal 浮层的点击以及结束外框内文字选择的点击会被忽略。它不更改输入框或会话状态。

浏览器半部是 [`src/client/index.ts`](src/client/index.ts)；node 半部把易变的品牌字段声明为自身的 `Config` 并声明 `{ auto: false }`，因为本包自带插件卡片，自动生成的页面只会与其重复。[帧图](src/client/assets/breach-atlas.webp) 来自用户提供的[展示视频](https://yinghuo-hg.deepseek.com/wuyexinrui/dev-cpu/web-showcase/orca.mp4)：截取 1.5–7.2 秒，以每秒 24 帧采样为 192 × 108 个单元，以无损 WebP 存储。红色与绿色通道以 32 级分别编码圆点半径和不透明度；绘制器在首次符合条件的点击后读取一次。浏览器标题是构建环境的事（`DSH_CLIENT_TITLE`），不在 slot 系统之内。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

当品牌面不够用时阅读以下页面。它们从本包占据的 slot 进入渲染这些 slot 的外壳。

- [ui-sidebar](../ui-sidebar/README.zh.md)——声明 `sidebar.brand.mark` 与 `sidebar.brand.name` 并渲染其回退。
- [ui-conversation](../ui-conversation/README.zh.md)——在首屏声明 `conversation.hero.brand.mark`，以及本包占用的 `conversation.hero.frame` 层。
- [Web 客户端架构](../../../docs/subsystems/web-client.zh.md)——浏览器插件行如何加载并注册 slot。

-----

<a id="model-experience"></a>
## 模型体验

无，因为本包只贡献浏览器呈现；这里没有任何内容进入模型请求。

#### KV Cache 影响

无；本包既不组装也不发送提供方请求。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>


这些限制界定了品牌呈现的供给方式。它们是当前包约束，不是品牌设计对比或任务积压。

- **只有一组填充**——替代呈现属于占据相同 slot 的另一个 Cordis 包。
- **装饰绘制需要 Canvas 2D**——上下文不可用或偏好减少动态效果时，首页保持留白。
- **浏览器标题独立**——`DSH_CLIENT_TITLE` 在构建时选择标题文本，而非通过 UI slot。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>
