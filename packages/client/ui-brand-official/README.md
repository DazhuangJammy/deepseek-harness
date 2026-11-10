---
description: "Configurable DeepSeek Harness branding for the sidebar and hero, and the default click-triggered pixel whale on the home page."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-brand-official

English | [中文](README.zh.md)

## Summary

This package gives the product a configurable brand and supplies the default home decoration. Settings → Plugins exposes an enabled flag, name, icon URL, and local image upload; the selected icon appears in both the sidebar and the new-session hero. Disabled or empty values keep each surface's existing fallback, while an `official` client build keeps the shipped DeepSeek Harness sidebar artwork without any configuration. The same package renders a click-triggered pixel whale on the blank home. The background owns only temporary canvas resources. Neither the settings nor the decoration affects model requests.

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

The shipped Web and Desktop compositions already mount this plugin. Home feedback needs no extra installation or enablement.

The node half declares the brand fields as its own entry Config, so the Host settings document persists them and the assembled Web client reads them at runtime through the generic configuration forms. Use Settings → Plugins → Interface branding to change the name and shared sidebar/hero icon, toggle it, upload an image, or restore defaults.

### Choosing the profile

`DSH_CLIENT_BUILD_PROFILE=official` keeps the shipped mark and name in the sidebar without any configured value, which is the profile the official build ships. Any other value leaves each brand slot to its declaring package until the accepted settings carry a value for that surface, so a local build keeps its own mark, build label, and version. A lightweight host without the configuration forms keeps the historical profile gate; the assembled Web client always has the service and can configure the brand.

The conversation hero shows the animated fish mark from `dsh-client-ui-conversation` until the settings enable the custom icon, which then replaces it. The home background is shared across build profiles, and the plugin loads and validates in both cases.

### Home feedback

The default home stays clear until a primary click on empty space plays one light-gray whale breach. Successive completed clicks alternate between dots and code lettering, starting with dots. Both use the same large animated silhouette. The animation lasts 5.7 seconds, then clears. Repeated clicks leave the current playback uninterrupted. The whale's frame layer classifies clicks: blank space inside its frame triggers playback, including margins beside the input card, while input fields, controls, the input card, portaled overlays, and a click that ends a text selection never do. The canvas takes neither focus nor pointer events; the frame receives the clicks. On narrow homes the whale keeps a larger scale and is cropped at the canvas edges, without adding horizontal scrolling. Reduced-motion preference disables it, and leaving the blank home releases its animation and observers.

The whale uses very faint neutral theme ink, appearing as a subtle background texture; code lettering has more contrast than the dots. Water splashes retain fine particles with stronger ink, especially on the left during landing. A packaged frame atlas supplies the motion; the browser loads it once through the plugin asset route on the first eligible click. Code fills use dense 7px lettering drawn only from authored code slogans, and the moving silhouette clips text as it enters or leaves the water. Decode or pixel-read failures stop the decoration, leave home usable, and log a reload action.

The whale's artwork values are fixed and it takes no configuration; the brand fields are separate settings. This is built-in presentation, without a separately installed bundle or Plugins-page toggle.

### Replacing the brand

A deployment with its own identity can leave this package out and compose another package that occupies the sidebar slots, the `conversation.hero.brand.mark` slot, and the `conversation.hero.frame` layer. When mounted, use Settings → Plugins → Interface branding to change the name and shared sidebar/hero icon, toggle it, upload an image, or restore defaults. Occupying a slot is the only composition route for the artwork identity; the whale's artwork is not configurable.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The two sidebar occupants install as one declaration-aware registration set: nested `ctx.slots.inject()` calls wait on the sidebar declaration, so the set works whether this row activates before or after the declarer, withdraws both occupants when the declaration collapses, and leaves no partial brand mix during HMR. The independent `conversation.hero.frame` layer owns the canvas renderer and waits for its declaration through `ctx.slots.inject()`. While `hero` is true it paints the canvas at negative `z-index`, which the frame contract places above the Conversation background and below all Conversation content. It plays on primary clicks that reach its own frame outside controls and the composer card; clicks from portaled overlays and clicks that end a text selection inside the frame are ignored. It never changes the composer or conversation state.

The browser half is [`src/client/index.ts`](src/client/index.ts); the node half declares the volatile brand fields as its own `Config` and claims `{ auto: false }`, because this package ships the Plugins card itself and an auto-generated page would duplicate it. The [frame atlas](src/client/assets/breach-atlas.webp) derives from the user-supplied [showcase video](https://yinghuo-hg.deepseek.com/wuyexinrui/dev-cpu/web-showcase/orca.mp4): 1.5–7.2 seconds at 24 frames per second, sampled to 192 × 108 cells and stored as lossless WebP. Its red and green channels encode dot radius and opacity at 32 levels; the renderer reads it once after the first eligible click. The browser title is a build-environment concern (`DSH_CLIENT_TITLE`), outside the slot system.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

Read these pages when the brand surface is not enough. They move from the slots this package occupies to the shell that renders them.

- [ui-sidebar](../ui-sidebar/README.md) — declares `sidebar.brand.mark` and `sidebar.brand.name` and renders their fallbacks.
- [ui-conversation](../ui-conversation/README.md) — declares `conversation.hero.brand.mark` in the hero and the `conversation.hero.frame` layer this package occupies.
- [Web client architecture](../../../docs/subsystems/web-client.md) — how browser plugin rows load and register slots.

-----

<a id="model-experience"></a>
## Model Experience

None, as the package contributes browser presentation only; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>


These limits define how brand presentation is supplied. They are current package constraints, not a brand-design comparison or a task backlog.

- **One occupant set** — alternative presentation belongs in another Cordis package occupying the same slots.
- **Decorative rendering requires Canvas 2D** — unavailable contexts or reduced-motion preference leave the home clear.
- **The browser title is independent** — `DSH_CLIENT_TITLE` selects title text at build time rather than through a UI slot.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
