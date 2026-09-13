# Agent Note: 未签名的 macOS 桌面版打包

Status: implemented

[English](2026-09-12-unsigned-macos-desktop-packaging.md) | 中文

## 问题

此前每个 macOS 桌面版产物都要求 Developer ID Application 身份、Apple Team ID 和一套完整的 notarytool 凭据，且 `parseDesktopPackageInvocation` 只对 `win-x64` 接受 `--unsigned`。在运行该应用的机器上构建它并不需要这些：macOS 只对下载得到的副本施加隔离属性，不对本机构建的副本施加，因此未签名构建可以直接打开。贡献者与自托管用户没有可用于这种情况的受支持命令。

## 决策

`--unsigned` 现在除 `win-x64` 外也接受 macOS 目标。未签名的 macOS 调用不解析发布身份与公证凭据，因此 `createElectronBuilderConfig` 设置 `identity: '-'`、`hardenedRuntime: false`、`notarize: false`、`dmg.sign: false`，并且不生成自动更新配置，也不写入发布完成记录。ad-hoc 身份让应用包自身持有有效签名：若只有 Electron 的链接器签名，macOS 会把被隔离的副本报告为已损坏，而不是提供打开选项。签名器忽略 `/Contents/Resources/dsh` 与 `/Contents/Resources/runtime`，因为对这些二进制做 ad-hoc 重签会产出启动时被内核杀掉的程序。

`prepare:dsh` 通过目标环境收到 `DSH_DESKTOP_UNSIGNED`，保留已准备运行时中各源码包自带的签名，而不再对每个内嵌 Mach-O 文件应用发布身份、安全时间戳与 hardened runtime。`verifyMacOSSignatureAfterSign` 与磁盘映像公证钩子不再执行。

未签名构建没有公证产物流，因此 `package-target` 跳过 App/DMG 双通道打包，由一次 electron-builder 调用直接产出 DMG 与 ZIP。产物落在 `.desktop-build/targets/<target>/unsigned-artifacts/`，固定目标入口是 `pnpm run package:desktop:mac:arm64:unsigned`。所有签名命令保持原有要求不变。

这在[桌面版打包决策](../architecture/2026-08-25-electron-desktop-packaging-and-updates.zh.md)所负责的签名、发布身份与发布要求之外增加了一种调用方式；该笔记仍是这些要求的归属方。

## 后果

- 未签名产物不携带发布身份，也没有公证票据。`upload:*` 仍会拒绝它，因为不存在发布完成记录；经过会施加隔离属性的传输（例如浏览器下载）之后，Gatekeeper 会要求用户显式确认打开一次。
- 运行时完整性仍然受验证：`prepare:dsh` 依据最终文件清单写入 `desktop-runtime.json`，载荷、Host 与清单检查在打包前后都会执行。
- 缺失或无效的签名不再可能在未签名构建中蒙混过关；签名路径仍是唯一会断言 Authority 与 Team ID 的路径。
- 发布资格认证仍要求生产环境，因此未签名产物不能作为发布依据。

## 考虑过的替代方案

**对每个内嵌 Mach-O 文件做 ad-hoc 签名。** 这可以修复自身签名无效的文件，但 npm 发布的与本机构建的原生文件本身已带有有效签名，而该遍历由发布身份路径负责。新增一套只服务于测试构建的签名实现，换取的是载荷冒烟测试已经覆盖的保障。

**macOS 凭据缺失时静默退回未签名。** 静默回退会让配置错误的发布在签名命令名下产出未签名安装包。模式必须由调用显式声明。

**继续把 macOS 排除在 `--unsigned` 之外。** 这会把本机场景推给手工改配置，而 `DSH_DESKTOP_UNSIGNED=1` 在 Windows 上正是为了避免这种情况。
