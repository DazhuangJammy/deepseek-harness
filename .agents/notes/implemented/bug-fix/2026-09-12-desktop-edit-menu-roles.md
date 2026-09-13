# Agent Note: Desktop standard editing roles in the application menu

Status: implemented

English | [中文](2026-09-12-desktop-edit-menu-roles.zh.md)

## Problem

The Electron shell installed an application menu holding only its own commands: Desktop Plugins, Check for Updates, and Quit. On macOS the standard editing shortcuts are dispatched by menu items carrying Electron's editing roles, so with no Edit menu the renderer's text fields received no copy, cut, paste, or select-all. The packaged application could not paste an API key into a settings field or copy text out of a transcript.

## Decision

The application menu now carries a second top-level Edit submenu whose items use Electron's roles — `undo`, `redo`, `cut`, `copy`, `paste`, `selectAll` — under labels from the shell dictionaries, so both shipped locales name them and the roles supply each platform's accelerators. The menu keeps its existing shape otherwise: the application menu stays first, and the shell still owns no other top-level menu.

## Consequences

- Standard editing shortcuts work in every window the shell opens, including the plugin manager's own inputs.
- Menu language follows the shell locale rather than Electron's own localized role labels, so the whole menu bar speaks one language.
- A menu item now needs a key in both shell dictionaries; the locale test's key-parity check fails otherwise.
- The renderer remains unmodified: no page implements its own clipboard handling to compensate.

## Alternatives considered

**Electron's built-in `role: 'editMenu'`.** One line would have provided the entire Edit menu, but its labels come from Electron's own translations rather than the shell dictionaries, so the app menu and the Edit menu could disagree on language in the same menu bar.

**Leaving the menu unchanged and handling the shortcuts in the renderer.** The browser application already receives no such commands, and a web page cannot implement the native clipboard for a text field; the roles are the only supported route.

**Adding the roles to the existing application menu instead of a separate submenu.** macOS reserves the first menu for application commands and its items are not the conventional home for editing; a separate Edit menu matches what users of other macOS applications expect.
