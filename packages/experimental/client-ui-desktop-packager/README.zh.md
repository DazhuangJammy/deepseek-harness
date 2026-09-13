---
description: "桌面版打包的浏览器插件：设置 → 插件中的「桌面版」tab，以及运行并观察一次本机免签名打包构建的 /desktop 命令。"
kind: "package-reference"
---

# @deepseek-ai/dsh-experimental-client-ui-desktop-packager

[English](README.md) | 中文

## 概述

`dsh-experimental-client-ui-desktop-packager` 为 Web 客户端提供设置 → 插件中的**桌面版** tab 和 `/desktop` 命令。两者都通过 `@deepseek-ai/dsh-experimental-desktop-packager` 生成的 Remote 命名空间驱动它：tab 显示目标、仓库、镜像、阶段、步骤、保留的构建输出与产出的安装包，并且只在完成勾选确认后才开始构建；命令提供同样的操作，其开始选项带同样的确认门控。插件自行挂载自己的 Remote 贡献，因此没有任何随附装配需要指名它。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)
- [开发说明](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

把本包挂载到宿主运行器旁边；[`desktop-packager-web-profile`](../desktop-packager-web-profile/README.zh.md) 会插入这两行。浏览器侧界面随后无需任何额外接线。

### 桌面版 tab

打开 设置 → 插件 → **桌面版**。tab 在挂载时读取一次状态，此后在构建运行期间每秒读取一次。**生成安装包** 会打开共享的确认对话框，在勾选确认框之前其主操作不可用；**取消构建** 会请求终止正在运行的子进程。**打开产物文件夹** 始终可用：存在产物时显示该产物，否则显示该目标的产物目录，因此首次构建之前也能打开该文件夹。构建完成后还会显示安装包路径及其复制操作。tab 渲染的一切都来自宿主：它自身不执行任何文件系统或进程操作。

### `/desktop` 命令

在输入框输入 `/desktop`。弹出菜单提供 **开始构建**（带同样的确认门控）、**查看当前状态** 与 **取消正在运行的构建**。该命令由客户端拥有，因此无需宿主描述符即可出现在斜杠菜单中，也不会向会话日志写入任何内容。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节 —— 点击展开</summary>

浏览器入口导入宿主包生成的 `./remote` 贡献并调用 `ctx.remote.$mount()`，随后注入 `remote.desktopPackager`、`slots`、`locale` 与 `commandUi` 来注册其界面。两个界面共享同一个注入面，因此传输失败在任何出现位置都以相同方式报告。tab 注册到设置分节的 `settings.plugins.tab` 槽；命令注册一个 `popupSelect` 贡献，其开始选项携带声明式 `SelectConfirmation`，由共享弹出外壳渲染为与 tab 相同的风险门控。

| 文件 | 作用 |
|---|---|
| [`src/client/index.ts`](src/client/index.ts) | 浏览器入口：挂载 Remote 贡献并应用界面 |
| [`src/client/mount.ts`](src/client/mount.ts) | Remote 挂载生命周期、字典、tab 与命令注册 |
| [`src/client/DesktopPackagerTab.tsx`](src/client/DesktopPackagerTab.tsx) | tab 组件、状态轮询与确认门控 |
| [`src/client/locales.ts`](src/client/locales.ts) | 中英文词典 |
| —— | 不发布运行时不变式同伴，因为本包不拥有独立的运行时关系；两个界面都是同一个 Remote 命名空间的投影。 |

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [宿主打包运行器](../desktop-packager/README.zh.md) —— 这里每个操作背后的服务。
- [opt-in Web 层](../desktop-packager-web-profile/README.zh.md) —— 挂载这两半的补丁。
- [插件设置分节](../../client/ui-settings-plugins/README.zh.md) —— 拥有 tab 外壳的分节。
- [实验性包](../README.zh.md) —— 孵化状态与发布策略。

-----

<a id="model-experience"></a>
## 模型体验

无。本包只渲染宿主上报的打包状态，从不构造模型输入。

#### KV Cache 影响

本包不添加任何模型请求内容，因此不改变提示前缀，也不改变缓存边界。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- **轮询而非流式** —— 构建运行期间 tab 每秒重新读取一次状态；命令在打开时读取一次。
- **仅限桌面版 tab** —— 界面位于 设置 → 插件；未注册任何会话或侧边栏入口。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>面向维护者的工作背景 —— 点击展开</summary>

[`tests/browser-plugin.client.spec.ts`](tests/browser-plugin.client.spec.ts) 通过测试用 Client Runtime 覆盖挂载、槽与命令注册、确认门控以及销毁。

</details>
