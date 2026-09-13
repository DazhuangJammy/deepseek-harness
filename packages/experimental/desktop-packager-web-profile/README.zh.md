---
description: "把实验性桌面版打包宿主服务、其设置 tab 与 /desktop 命令加入 Web profile。"
kind: "package-bundle"
---

# @deepseek-ai/dsh-experimental-desktop-packager-web-profile

[English](README.md) | 中文

## 概述

`dsh-experimental-desktop-packager-web-profile` 是[桌面版打包](../desktop-packager/README.zh.md)的 opt-in Web 层。把它装在 `@deepseek-ai/dsh-web-app` 之后，即可加入 设置 → 插件 中的**桌面版** tab 与 `/desktop` 命令，两者都运行当前检出自带的免签名打包脚本。该层只携带一个补丁，自身没有行为；移除它会同时移除两行，稳定的 Web 组合不受影响。没有任何随附 profile 默认启用它。

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

### 安装到 profile

这些包是私有的，因此检出目录通过路径安装。三个链接放在一条命令里，因为 profile 本身是 workspace 根：

```sh
pnpm dsh plugin --profile web add -w \
  link:<checkout>/packages/experimental/desktop-packager \
  link:<checkout>/packages/experimental/client-ui-desktop-packager \
  link:<checkout>/packages/experimental/desktop-packager-web-profile
```

前两个链接让两个插件包可从 profile 解析；第三个激活本包声明的补丁，profile 会把该包记入其有序 bundle 列表。用 `pnpm dsh plugin --profile web remove -w @deepseek-ai/dsh-experimental-desktop-packager-web-profile` 移除第三个链接即可去掉这两行。安装后需要重启宿主：bundle 会加入启动组合，这与重新构建的客户端 bundle 不同。

### 得到什么

设置 → 插件 中新增**桌面版** tab，输入框新增 `/desktop`。两者都通过 [`@deepseek-ai/dsh-experimental-client-ui-desktop-packager`](../client-ui-desktop-packager/README.zh.md) 为自身挂载的 Remote 命名空间访问 `@deepseek-ai/dsh-experimental-desktop-packager`。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节 —— 点击展开</summary>

本包的运行时内容是 [`cordis.patch.yml`](cordis.patch.yml)。它在 `dsh-web-app` 之后应用，其单个 `insert` 条目加入 `desktop-packager` 与 `ui-desktop-packager` 两行。被插入的插件拥有打包服务、Remote 命名空间与浏览器界面；这个静态 bundle 不保存可变状态。

| 文件 | 作用 |
|---|---|
| [`cordis.patch.yml`](cordis.patch.yml) | 含两行的有序 Web 补丁 |
| [`src/index.ts`](src/index.ts) | 空模块入口；补丁才是运行时内容 |
| —— | 不发布运行时不变式同伴，因为本包只携带一个静态 profile 补丁。 |

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [宿主打包运行器](../desktop-packager/README.zh.md) —— 本层挂载的服务。
- [桌面版打包浏览器界面](../client-ui-desktop-packager/README.zh.md) —— 本层挂载的 tab 与命令。
- [实验性包](../README.zh.md) —— 孵化状态与发布策略。
- [Web bundle](../../bundle/web-app/README.zh.md) —— 本补丁扩展的稳定浏览器层。

-----

<a id="model-experience"></a>
## 模型体验

无。本层只插入一个由人操作的打包服务及其浏览器界面。

#### KV Cache 影响

本 Web bundle 不添加任何模型请求内容，因此不改变提示前缀，也不改变缓存边界。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- **仅限 opt-in** —— 没有任何随附 Web profile 启用本层；该功能只存在于有检出目录的地方。
- **按设计只在检出目录内可用** —— 打包流水线会打包并构建本仓库，因此对没有源码树的安装毫无用处。
- **需要重启** —— 安装或移除本层会改变启动组合；正在运行的宿主在重启前仍保持先前的行。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>面向维护者的工作背景 —— 点击展开</summary>

无。

</details>
