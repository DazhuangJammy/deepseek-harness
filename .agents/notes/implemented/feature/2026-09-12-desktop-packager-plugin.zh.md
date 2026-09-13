# Agent Note: opt-in 桌面版打包插件

Status: implemented

[English](2026-09-12-desktop-packager-plugin.md) | 中文

## 问题

产出一个可安装的桌面版构建，需要知道打包命令、它所需的环境变量，以及产物落在哪里。仓库已经带有这条流水线，但产品里没有任何东西能启动它：开发者只能在源码检出中敲命令，而 Web 客户端没有提供任何入口。

## 决策

一个实验性三件套把该能力承载为 opt-in Web 层：[`desktop-packager`](../../../../packages/experimental/desktop-packager/README.zh.md) 拥有宿主侧构建，[`client-ui-desktop-packager`](../../../../packages/experimental/client-ui-desktop-packager/README.zh.md) 拥有浏览器界面，[`desktop-packager-web-profile`](../../../../packages/experimental/desktop-packager-web-profile/README.zh.md) 是插入这两行的补丁。该层通过路径安装，绝不出现在默认 profile 中，其包保持私有。

宿主服务通过 `subprocess` 能力把检出自带的 `package:desktop:<target>:unsigned` 脚本作为一次由人发起的构建来运行。同一时间只存在一次运行；`status`、`start`、`cancel` 就是 Remote 接口的全部，状态中携带配置、阶段、由流水线自身输出标记推导出的单调步骤、有界的输出尾部、取消状态，以及构建成功时解析出的安装包。拒绝结果是带有待修正配置值的业务结果，而不是 Remote 失败：配置根目录下没有 `apps/desktop`、目标需要另一个构建宿主、已有构建在运行，或进程无法启动。

宿主还通过平台自带的文件管理器（`open -R`、`explorer /select,`）显示已产出的安装包（尚未产出时显示该目标的产物目录），而不是只返回一个可复制的路径：桌面版组合禁用了仓库的 open-in-app 能力及其路由，而"显示产物"本就属于产出该文件的那次操作。

浏览器侧导入生成的 `/remote` 贡献并用 `ctx.remote.$mount()` 挂载它，因此没有任何随附装配指名该插件。它注册一个 `settings.plugins.tab` 贡献和一个客户端拥有的、名为 `desktop` 的 `commandUi` 贡献。两者驱动同一个注入面。开始构建以用户必须勾选的确认为门控：tab 渲染共享的 `RiskConfirmation`，命令的开始选项携带等价的声明式 `SelectConfirmation`。

## 后果

- 检出目录通过安装三个 `link:` 行并重启宿主即可获得该功能；随附的 Web 组合不变，移除该层即移除这两行。
- 构建会重写它所运行的检出目录，首次使用时需要联网获取 Node 运行时与 Electron，并在 `apps/desktop/.desktop-build` 下写入数 GB 数据。
- 状态是轮询而非流式，因此浏览器按轮询间隔看到步骤变化。
- 产品无法为它没有的检出打包，这正是该层不进入随附默认、而不是对 npm 安装用户降级的原因。
- 未签名产物仅限本地使用：打包流水线省略签名、公证与发布完成记录，因此上传命令仍会拒绝它们。

## 考虑过的替代方案

**在 `dsh-web-app` 中加一行，并由 `api-remotes` 挂载其 Remote。** 那是随附功能的形态，但它会把一个 Electron 打包按钮摆在所有 Web 用户面前（包括没有源码树的安装），同时让该插件成为 API 装配的永久依赖。opt-in 不应进入随附默认。

**用 `ctx.jobs` 承载构建。** Web profile 不挂载全局 job 控制器，无主 job 无法启动；Jobs 界面是只读状态镜像，既无流式输出也无法由人取消，因此进度与取消能力仍需要自己的通道。

**用 `ctx.approval.request()` 做确认。** 它要求存在 Agent 与开启的 turn，且请求必须是 tool 形状，因此在空闲会话上点击无法使用它。Web 控件改动宿主状态的标准做法是客户端风险门控，tab 与命令都用它。

**让构建走 `ctx.shell`。** 那条接缝的沙箱约束模型发起的命令，并把写入限制在工作区内，而打包流水线会把 Electron 与包管理器缓存写到工作区之外。插件不能为自己授予该提权，因此诚实的选择是桌面外壳自身包操作所用的、不受该沙箱约束的接缝。

**通过流式 Remote 方法推送进度。** 网关支持，但它需要自己的重连语义和一个能受益的消费者；轮询单个一元方法让第一版更小。
