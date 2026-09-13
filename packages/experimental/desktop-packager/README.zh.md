---
description: "面向 opt-in 桌面版打包插件的宿主侧打包运行器：把仓库自带的免签名打包脚本作为一次由人发起的构建来运行，并暴露可观察的阶段、步骤、输出尾部与产物。"
kind: "package-reference"
---

# @deepseek-ai/dsh-experimental-desktop-packager

[English](README.md) | 中文

## 概述

`dsh-experimental-desktop-packager` 把当前源码检出中自带的免签名桌面版打包脚本作为一次宿主拥有的构建来运行，并把它的进行状态暴露出来：生命周期阶段、流水线步骤、有界的输出尾部、取消能力，以及它产出的安装包。当配置的根目录不含 `apps/desktop`、目标需要另一个构建宿主、已有构建在运行，或进程无法启动时，它会拒绝开始，并在每种情况下指出需要修正的配置值。浏览器侧为 [`@deepseek-ai/dsh-experimental-client-ui-desktop-packager`](../client-ui-desktop-packager/README.zh.md)。

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

把本包作为 Loader 行挂载到其浏览器侧同伴旁边；[`desktop-packager-web-profile`](../desktop-packager-web-profile/README.zh.md) 是同时插入两者的 opt-in 层。该行接受以下配置字段：

| 字段 | 默认值 | 含义 |
|---|---|---|
| `repositoryRoot` | 宿主进程的工作目录 | 含 `apps/desktop` 的检出目录，其打包脚本会被运行 |
| `appId` | `com.deepseek.harness.desktop` | 作为 `DSH_DESKTOP_APP_ID` 传入的反向域名应用 ID |
| `electronMirror` | 宿主环境中的 `ELECTRON_MIRROR` | 转发给打包流水线的 Electron 镜像 |
| `target` | `mac-arm64` | 固定打包目标：`mac-arm64` 或 `win-x64` |
| `logTailChars` | `32768` | 上报给浏览器的输出尾部保留字符数 |

### 生成的 Remote 接口

| 方法 | 返回 |
|---|---|
| `desktopPackager/status` | 当前阶段、步骤、保留的输出尾部，以及安装包或失败原因 |
| `desktopPackager/start` | 被接受构建的状态，或带有错误码与待修正配置的拒绝结果 |
| `desktopPackager/cancel` | 请求终止正在运行的构建之后的状态 |
| `desktopPackager/reveal` | 成功，或无法在本机文件管理器中显示任何内容时的原因 |

构建成功后，会依据根清单的版本从 `apps/desktop/.desktop-build/targets/<target>/unsigned-artifacts/` 解析出安装包，并报告其字节数。`reveal` 通过平台自带的文件管理器打开已产出的安装包；尚未产出时改为打开该目标的 `unsigned-artifacts` 目录（该目录不存在时会先创建）——macOS 用 `open -R`，Windows 用 `explorer /select,`——并在其以非零状态退出时报告该启动器的诊断信息。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节 —— 点击展开</summary>

服务同一时间只拥有一次构建。`start` 解析配置的目标，检查该目标所需的构建宿主是否为当前平台，然后在配置的根目录中通过 `subprocess` 能力启动 `pnpm run package:desktop:<target>:unsigned`，并传入应用 ID 以及（配置时）`ELECTRON_MIRROR`。两个输出流都被有界收集；每次 `status` 读取会把自上次读取以来的增量并入保留尾部，并通过匹配流水线自身的输出标记来推进单调递增的步骤。结算时判定退出状态、替换被取消构建的阶段，或解析安装包。

该运行刻意不走 `ctx.shell`：那条接缝的沙箱约束的是模型发起的命令，而这是一次由人发起、经客户端确认门控的宿主操作，其 Electron 与包管理器缓存位于工作区之外。

| 文件 | 作用 |
|---|---|
| [`src/index.ts`](src/index.ts) | 打包服务、启动请求、步骤识别、结算与产物解析 |
| [`src/types.ts`](src/types.ts) | 线上可见的配置与状态类型 |
| —— | 不发布运行时不变式同伴，因为本包不拥有独立的运行时关系；它的观察全部来自它自己启动并停止的单个子进程。 |

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [桌面版打包浏览器界面](../client-ui-desktop-packager/README.zh.md) —— 基于本服务的设置页 tab 与 `/desktop` 命令。
- [opt-in Web 层](../desktop-packager-web-profile/README.zh.md) —— 挂载这两半的 profile 补丁。
- [实验性包](../README.zh.md) —— 孵化状态与发布策略。
- [桌面版应用](../../../apps/desktop/README.zh.md) —— 本服务所运行的打包流水线。

-----

<a id="model-experience"></a>
## 模型体验

无。本包只启动并观察一个本地打包子进程，不向模型返回任何自身文本。

#### KV Cache 影响

本包不添加任何模型请求内容，因此不改变提示前缀，也不改变缓存边界。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- **同一时间只能有一次构建** —— 构建运行期间第二次 `start` 会被拒绝；并行目标留待后续。
- **构建会重写它所在的检出目录** —— 流水线会重建仓库产物并在 `apps/desktop/.desktop-build` 下写入数 GB 数据，因此正在服务该检出的宿主在构建期间可能看到短暂的资源变化。
- **需要网络访问** —— 首次构建会下载 Node 运行时与 Electron；默认 Electron 下载源不可达时必须配置 `electronMirror`。
- **没有进度流** —— 浏览器通过轮询读取状态；在出现需要亚秒级进度的消费者之前，流式 Remote 方法留待后续。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>面向维护者的工作背景 —— 点击展开</summary>

服务在 [`tests/desktop-packager.spec.ts`](tests/desktop-packager.spec.ts) 中针对伪造的 `subprocess` 句柄进行测试，覆盖拒绝路径、步骤识别、结算、取消、尾部边界与产物解析，且不运行真实构建。

</details>
