---
uid: story-e53ba4cf
id: STORY-40
type: story
title: Theme tokens generate CSS custom properties with defaults, dark mode, and a
  vetted fonts shortlist
created_by: xgd
created_at: '2026-06-25T00:48:48.787342+00:00'
updated_at: '2026-06-29T23:52:40.164898+00:00'
completed_at: null
last_field_updated: story_kind
status: reconciling
fields:
  intent_uid: bundle-94e1d1b6
  capability_uid: capability-c64bb7c7
  story_kind: upgrade
  story_points: 2
  uat_coverage: pass
---

## Story

**As a** site operator (or AI builder agent acting on their behalf),
**I want** the abstract theme tokens I supply (palette, typography,
spacing, radius, shadow, containers, breakpoints) to be translated into a
stable, named set of CSS custom properties on `:root` — with sensible
defaults filling any slot I omit, an optional dark-mode color override,
a vetted Google-Fonts shortlist I can resolve my font choices against,
and a non-blocking WCAG-AA contrast check that warns me when a palette
produces unreadable foreground/background pairs —
**so that** customer sites can be themed by configuration alone, every
site module references the same deterministic CSS variable names without
each module reimplementing theming logic, and accessibility problems in
an operator/AI-supplied palette are surfaced rather than shipped silently.

## Description

The framework theme system is the bridge between theme-token *data* (the
shape owned by `@1stcontact/site-schema`) and browser-ready *CSS*. The
user-visible capability is:

- A token-to-CSS translation that emits a `:root` block of CSS custom
  properties for every locked theme slot, with deterministic kebab-cased
  names: `--color-<role>`, `--font-family-<name>`, `--font-size-<step>`,
  `--font-weight-<name>`, `--line-height-<name>`, `--space-<step>`,
  `--radius-<name>`, `--shadow-<name>`, `--container-<name>`,
  `--breakpoint-<name>`.
- A published default-token set so a site can specify only what it wants
  to override; everything else is filled in.
- An optional dark-palette override that produces a
  `@media (prefers-color-scheme: dark)` block overriding only the
  supplied color roles, leaving the rest inherited from `:root`.
- A vetted Google Fonts shortlist (13 fonts) with per-font metadata, a
  helper that resolves a CSS font-family declaration to its vetted spec,
  and a helper that builds a Google Fonts CSS2 URL from a list of specs.
- A WCAG-AA contrast check over the merged palette. The generator scores
  the four rendered surface pairs — `default` (bg ↔ text), `subtle`
  (surfaceSubtle ↔ text) and `inverse` (surfaceInverse ↔ bg) against the
  4.5:1 body-text threshold, and `accent` (accent ↔ bg) against the 3.0:1
  large-text/CTA threshold. For each failing pair it prepends an
  `/* fc-contrast-warning: <surface> surface — <fg> on <bg> = <ratio>:1
  (below WCAG AA <threshold>:1) */` comment ahead of the `:root` block
  and logs a single `console.warn` naming the failing surfaces. The
  palette is still rendered exactly as supplied — this warns, it does not
  block or auto-correct, and the `:root` variable block is unchanged. A
  fully-passing palette emits no warning comment and no `console.warn`.
  The framework also publishes the contrast primitives (a hex-pair
  contrast-ratio function and a per-surface evaluator returning one
  scored pair per surface) as part of its API surface.

**In scope:** the published variable-name contract, the defaults, the
dark-mode block, the fonts shortlist + lookup + URL helpers, and the
per-surface WCAG-AA contrast evaluation + stylesheet warning emission.

**Out of scope:** module rendering (separate framework story); how the
generated CSS is wired into a finished page (the static generator's
job); per-site font *choices* (the site definition's job);
shape/regex validation of the supplied theme tokens (the schema's job);
auto-correcting or blocking a low-contrast palette (the contrast check
warns only).

## Technical Context

The token shape is owned by `@1stcontact/site-schema`; the framework
package re-exports it from there. The Phase-0 superset (9-role palette,
9-step type scale with weights and lineHeights, 10-step geometric
spacing, 4 container slots) is the locked contract; the variable names
documented above are part of the published API surface because customer-
site modules and inline styling reference them.

The vetted fonts shortlist lives in the framework theme surface (not in
per-site code) because per-site typography family declarations need to
map deterministically to a small, predictable set of Google Fonts URLs
so the static generator can emit preconnect/preload/stylesheet links
without arbitrary network lookups.

This story does not validate token values (e.g. that `#abcdef` is a
valid hex color) — that contract sits in the Site Definition Schema
capability (CAP-32). This story formats whatever it is given.

The contrast check is deliberately advisory: transcribed/AI-supplied
palette tokens can produce unreadable pairs (e.g. light text on a light
surface), so the generator surfaces the problem (stylesheet comment +
console warning) but still renders the operator's palette as-is rather
than overriding their choice. The four surface→pair mappings and
thresholds mirror how the surfaces are actually painted (inverse and
accent surfaces flip the foreground to the background color). The
contrast-ratio math uses the WCAG relative-luminance formula and accepts
3-, 6-, and 8-digit hex input.

Supporting evidence (carried in the same change, not a separate
acceptance criterion here): the convert-flow LLM instructions
(`docs/llm-context/reproducing-a-website.md` section 1a and its
byte-for-byte mirror in `apps/control-app/src/llm-context.ts`) document
the four surface pairs and tell the AI to compute the ratio per pair and
re-issue `set_theme_token` (swap or fall back to defaults) when a pair
fails.

The CSS generator output is consumed by `tools/generate` (a downstream
story) and observable to end users as the `theme.css` shipped with each
customer site.

## Dependencies

- Site Schema (plan item 2) for the `ThemeTokens` type definition.

## Story Points

2
