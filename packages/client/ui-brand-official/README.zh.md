---
description: "面向侧栏的官方 DeepSeek Harness 品牌填充，仅在官方构建中生效；供选择或替换品牌呈现的用户与维护者阅读。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-brand-official

[English](README.md) | 中文

## 概述

本包为产品提供可配置品牌。设置 → 插件会显示启用开关、名称、图标地址和本地图片上传；选定的图标会同时用于侧栏和新会话首屏。关闭或留空时，各界面保留自己的现有回退。设置会持久化，也不影响模型请求。

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

将本插件挂载到浏览器插件名单。node 半部把品牌字段声明为自身的条目 Config，因此宿主设置文档负责持久化，完整 Web 客户端在运行时通过通用的配置表单读取它们。

### 选择 profile

`DSH_CLIENT_BUILD_PROFILE=official` 在没有任何已配置取值时也保留侧边栏中随包发布的标识与名称，这也是官方构建使用的 profile。其他取值下，每个品牌槽位都仍由其声明包负责，直到设置为该界面携带了取值；因此本地构建保留自己的标识、构建标签与版本号。

### 替换品牌

拥有其他身份的部署可以不组合本包，而是组合另一个占据品牌 slot 的包。挂载本包后，可在设置 → 插件 → 界面品牌中修改名称及侧栏/首屏共用图标、切换启用状态、上传图片或恢复默认。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

两个填充作为一组声明感知的注册安装：嵌套的 `ctx.slots.inject()` 调用等待侧栏声明，因此无论本行在声明者之前还是之后激活，这组注册都能工作；声明消失时两个填充一并撤回，HMR 期间也不会留下残缺的品牌混合。浏览器半部是 [`src/client/index.ts`](src/client/index.ts)；node 半部把易变的品牌字段声明为自身的 `Config` 并声明 `{ auto: false }`，因为本包自带插件卡片，自动生成的页面只会与其重复。浏览器标题是构建环境的事（`DSH_CLIENT_TITLE`），不在 slot 系统之内。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

当品牌面不够用时阅读以下页面。它们从本包占据的 slot 进入渲染这些 slot 的外壳。

- [ui-sidebar](../ui-sidebar/README.zh.md)——声明 `sidebar.brand.mark` 与 `sidebar.brand.name` 并渲染其回退。
- [ui-conversation](../ui-conversation/README.zh.md)——在首屏声明 `conversation.hero.brand.mark`。
- [Web 客户端架构](../../../.agents/notes/implemented/architecture/2026-07-19-gui-web-client-architecture.zh.md)——浏览器插件行如何加载并注册 slot。

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
- **浏览器标题独立**——`DSH_CLIENT_TITLE` 在构建时选择标题文本，而非通过 UI slot。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>

**运行时不变式：** 不发布伴生入口。本包不保留可变状态，三个 slot occupant 通过同一个事务性 effect 安装和释放。
