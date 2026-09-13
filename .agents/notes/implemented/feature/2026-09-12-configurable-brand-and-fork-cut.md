# Agent Note: Configurable desktop brand and fork cut

Status: implemented

English | [中文](2026-09-12-configurable-brand-and-fork-cut.zh.md)

## Problem

The browser brand plugin rendered one fixed official mark and name, and `DSH_CLIENT_BUILD_PROFILE=official` decided whether it registered them. A deployment with a different identity had to leave the package out and compose its own occupant package, because the shipped plugin exposed no configuration surface. The blank-session hero showed its animated mark and its own `hero.headline` text regardless of the sidebar, so a deployment could not present one brand across both surfaces.

Fork creation cut the child log from `boundary.seq + 1`. Sequence values are contiguous in a live Session, but nothing makes the observation array indexed by sequence: a prepared or cold read can carry non-indexed values, and that cut could then retain the next turn's user input inside the fork.

## Decision

The plugin owns the durable `ui-brand-official` settings namespace, whose `BrandSettingsSchema` holds `enabled`, `name`, and `icon`. The Host half registers that schema when the `settings` service is composed. The browser half binds a `SettingsScope` to the namespace and publishes a controller face — the `brand` and `editor` snapshot stores plus `edit`, `save`, and `reset` — to every occupant it registers.

Settings → Plugins renders one brand card: the enabled toggle, the name field, the icon URL, a local image upload, an unsaved marker, Save, and Reset. Save writes one mutation that sets all three keys, trimming the name and the icon; Reset unsets them so the schema defaults return. A failed write raises the card's failure state instead of reporting success.

The brand plugin occupies a slot only where a brand actually applies. The official build profile keeps the shipped mark and name in the sidebar, because that profile ships the official identity. Every other host leaves each slot to its declaring package until the accepted settings carry a value for that surface, so a local build keeps its own mark and build label instead of silently adopting the official wordmark. A store subscription registers or disposes each occupant as the settings change, so a slot returns to its declaring fallback as soon as the value that filled it is cleared.

The conversation hero keeps its own surfaces: this change adds the `conversation.hero.brand.name` slot beside the existing `conversation.hero.brand.mark`, and `EmptyHero` renders the new slot with the `hero.headline` text as its fallback. Neither hero slot has an official-profile exception, because their fallbacks already are the shipped presentation.

Fork creation resolves the cut from the matched event's array position (`indexOf(boundary) + 1`) in both the Host command controller and the browser fixture.

## Consequences

- A deployment changes its own brand from Settings → Plugins; the values are durable, reach every window, and need no browser rebuild or roster change.
- Empty values and a disabled brand keep each surface's existing fallback, so enabling the feature without filling it in changes nothing.
- The blank-session hero and the sidebar can share one uploaded icon, and another occupant package can still take the same slots.
- The plugin now needs the settings, locale, settings-plugin, and conversation client services; its package manifest and dependency set grow accordingly, and `docs/config-catalog.md` documents the new namespace.
- Fork creation no longer assumes sequence values equal array positions.
- A local build keeps its own sidebar mark and build label until someone configures a brand, so the change is invisible to a deployment that never enables it.
- `DSH_CLIENT_BUILD_PROFILE` still decides whether a host without a `settingsScope` registers anything, and it now also decides whether an unconfigured sidebar keeps the shipped brand.

## Alternatives considered

**Keep the profile gate and require a replacement package for a custom identity.** Rejected because the documented route made every rebrand a copy of the plugin plus a client rebuild, while the settings service and its Plugins surface already existed to carry durable per-deployment values.

**Register every occupant unconditionally and render the fallback inside it.** Rejected because the mark and the name are separate slots with independent values; an occupant that always registered would take the slot from the package that declares it, so a local build would publish the official wordmark instead of its own build label.

**Store the brand in the client store rather than the settings service.** Rejected because the values outlive one browser profile and must reach every window, which is what the durable settings section provides.

**Find the boundary by sequence value instead of object identity.** Rejected because the matched event is already the array element to cut after, so a second lookup by sequence value adds a search without changing the result.
