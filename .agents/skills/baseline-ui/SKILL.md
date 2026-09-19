---
name: baseline-ui
description: Review and harden existing UI against practical baseline rules. Use when checking a component, page, or feature for accessibility, animation safety, layout anti-patterns, incomplete states, and sloppy Tailwind/UI decisions, especially after using frontend-design.
license: Adapted locally from external evaluation sources. See README.md.
---

# Baseline UI

Use this skill after UI work has been created.
Its job is not to invent a visual direction.
Its job is to catch avoidable mistakes.

## What to do
When reviewing a file or feature:
- quote the exact problem
- explain briefly why it matters
- give the concrete fix
- prefer code-level suggestions over vague design advice

## Check these areas

### Accessibility
- icon-only buttons need `aria-label`
- keyboard/focus behavior should come from proper primitives when relevant
- destructive actions should be explicit and safe
- inline errors should appear near the action that failed

### Layout
- avoid `h-screen` for app shells and similar full-height UI
- avoid fragile layout math when grid/flex utilities can solve it more cleanly
- avoid arbitrary z-index spam

### Motion
- prefer transform and opacity
- avoid animating width, height, top, left, margin, and padding
- avoid paint-heavy blur/glow animation on large surfaces
- keep interaction feedback short and crisp

### States
- loading / empty / error states should exist when the surface needs them
- empty states should contain one clear next action

### Visual hygiene
- avoid generic gradient/glow crutches
- avoid unnecessary card nesting
- prefer existing tokens and component primitives

## Output style
When reviewing, return:
- violations
- why each matters
- exact fix

When rewriting code, keep the original product intent and make the smallest strong correction set.
