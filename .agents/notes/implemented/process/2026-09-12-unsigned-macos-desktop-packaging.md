# Agent Note: Unsigned macOS Desktop packaging

Status: implemented

English | [中文](2026-09-12-unsigned-macos-desktop-packaging.zh.md)

## Problem

Every macOS Desktop artifact required a Developer ID Application identity, an Apple Team ID, and one complete notarytool credential strategy, and `parseDesktopPackageInvocation` rejected `--unsigned` for any target other than `win-x64`. Building the application on the machine that runs it needs neither: macOS applies the quarantine attribute to downloaded copies rather than to locally built ones, so an unsigned build opens directly. Contributors and self-hosting users had no supported command for that case.

## Decision

`--unsigned` now accepts the macOS targets beside `win-x64`. An unsigned macOS invocation resolves no release identity and no notary credentials, so `createElectronBuilderConfig` sets `identity: '-'`, `hardenedRuntime: false`, `notarize: false`, and `dmg.sign: false`, and emits neither automatic-update configuration nor a release completion record. The ad-hoc identity keeps the application bundle's own signature valid: with only Electron's linker signature, macOS reports a quarantined copy as damaged instead of offering to open it. The signer ignores `/Contents/Resources/dsh` and `/Contents/Resources/runtime`, because re-signing those binaries ad-hoc leaves executables the kernel kills on launch.

`prepare:dsh` receives `DSH_DESKTOP_UNSIGNED` through the target environment and leaves the prepared runtime with the signatures its source packages already carry, instead of applying the release identity, a secure timestamp, and hardened runtime to every embedded Mach-O file. `verifyMacOSSignatureAfterSign` and the disk-image notarization hook do not run.

An unsigned build has no notarization lane, so `package-target` skips the two-lane App/DMG packaging and lets one electron-builder pass emit the DMG and ZIP. Artifacts land in `.desktop-build/targets/<target>/unsigned-artifacts/`, and `pnpm run package:desktop:mac:arm64:unsigned` is the fixed-target entry point. Every signed command keeps its existing requirements.

This adds one invocation mode beside the signing, release identity, and publishing requirements owned by the [Desktop packaging decision](../architecture/2026-08-25-electron-desktop-packaging-and-updates.md); that note remains their owner.

## Consequences

- An unsigned artifact carries no release identity and no notarization ticket. `upload:*` still refuses it, because no release completion record exists, and Gatekeeper asks for one explicit Open confirmation after a transfer that quarantines the file, such as a browser download.
- Runtime integrity is still verified: `prepare:dsh` writes `desktop-runtime.json` from the final file inventory, and the payload, Host, and inventory checks run before and after packaging.
- A missing or invalid signature can no longer pass unnoticed inside an unsigned build; the signed path remains the only one that asserts an authority and Team ID.
- Release qualification still requires the production environment, so an unsigned artifact cannot qualify a release.

## Alternatives considered

**Ad-hoc signing every embedded Mach-O file.** It would repair files whose own signature is invalid, but npm-published and locally built native files already carry valid signatures, and the release identity path owns that walk. Adding a second signing implementation whose only consumer is a test build trades that safety for a code path the payload smoke already covers.

**Falling back to unsigned when macOS credentials are absent.** A silent fallback would let a misconfigured release produce an unsigned installer under a signed command name. The mode stays explicit in the invocation.

**Keeping macOS out of `--unsigned`.** It would leave the local case to hand-edited configuration, which is what `DSH_DESKTOP_UNSIGNED=1` exists to avoid on Windows.
