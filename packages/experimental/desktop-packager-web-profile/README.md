---
description: "Add the experimental Desktop packager Host service, its Settings tab, and the /desktop command to a Web profile."
kind: "package-bundle"
---

# @deepseek-ai/dsh-experimental-desktop-packager-web-profile

English | [中文](README.zh.md)

## Summary

`dsh-experimental-desktop-packager-web-profile` is the opt-in Web layer for the [Desktop packager](../desktop-packager/README.md). Install it after `@deepseek-ai/dsh-web-app` to add the Settings → Plugins **Desktop** tab and the `/desktop` command, both running this checkout's own unsigned packaging script. The layer carries one patch and no behaviour of its own; removing it removes both rows and leaves the stable Web composition unchanged. No shipped profile enables it by default.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

### Install into a profile

These packages are private, so a checkout installs them by path. All three links go in one command, because a profile is a workspace root:

```sh
pnpm dsh plugin --profile web add -w \
  link:<checkout>/packages/experimental/desktop-packager \
  link:<checkout>/packages/experimental/client-ui-desktop-packager \
  link:<checkout>/packages/experimental/desktop-packager-web-profile
```

The first two links make both plugin packages resolvable from the profile; the third activates this package's declared patch, which the profile records in its ordered bundle list. Removing the third link with `pnpm dsh plugin --profile web remove -w @deepseek-ai/dsh-experimental-desktop-packager-web-profile` drops the rows again. Restart the Host after installing: a bundle joins the boot composition, unlike a rebuilt client bundle.

### What you get

Settings → Plugins gains a **Desktop** tab, and the composer gains `/desktop`. Both reach `@deepseek-ai/dsh-experimental-desktop-packager` through the Remote namespace that [`@deepseek-ai/dsh-experimental-client-ui-desktop-packager`](../client-ui-desktop-packager/README.md) mounts for itself.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The package's runtime content is [`cordis.patch.yml`](cordis.patch.yml). Applied after `dsh-web-app`, its single `insert` entry adds the `desktop-packager` and `ui-desktop-packager` rows. The inserted plugins own the packaging service, the Remote namespace, and the browser surfaces; this static bundle holds no mutable state.

| File | Role |
|---|---|
| [`cordis.patch.yml`](cordis.patch.yml) | Ordered Web patch containing both rows |
| [`src/index.ts`](src/index.ts) | Empty module entry; the patch is the runtime content |
| — | No runtime invariant companion is published because the package carries only a static profile patch. |

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Host packaging runner](../desktop-packager/README.md) — the service this layer mounts.
- [Desktop packager browser UI](../client-ui-desktop-packager/README.md) — the tab and command this layer mounts.
- [Experimental packages](../README.md) — incubation status and publication policy.
- [Web bundle](../../bundle/web-app/README.md) — the stable browser layer this patch extends.

-----

<a id="model-experience"></a>
## Model Experience

None, as the layer only inserts a human-operated packaging service and its browser surfaces.

#### KV Cache effect

This Web bundle adds no model request content, so it changes no prompt prefix and no cache boundary.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **Opt-in only** — no shipped Web profile enables this layer; the feature exists only where a checkout is present.
- **Checkout-only by construction** — the packaging pipeline packs and builds this repository, so the layer is useless to an installation that has no source tree.
- **Restart required** — installing or removing the layer changes the boot composition; a running Host keeps its previous rows until it restarts.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
