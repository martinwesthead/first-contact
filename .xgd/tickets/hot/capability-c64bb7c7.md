---
uid: capability-c64bb7c7
id: CAP-33
type: capability
title: Framework Theme Tokens & CSS Generation
created_by: xgd
created_at: '2026-06-25T00:48:22.764636+00:00'
updated_at: '2026-06-25T00:48:22.764636+00:00'
completed_at: null
last_field_updated: created_at
status: active
fields:
  name: framework_theme_tokens
---

# Framework Theme Tokens & CSS Generation

The framework's theme surface: the bridge between abstract theme-token data
(shape owned by site-schema) and browser-ready CSS custom properties.

Encompasses:
- The token-to-CSS generator that emits a `:root` block with one CSS custom
  property per locked theme slot, using deterministic kebab-cased variable
  names that customer-site modules and inline styling can rely on.
- The published default-token set used to fill any slot a site definition
  omits.
- The optional dark-palette override that emits a
  `@media (prefers-color-scheme: dark)` block.
- The vetted Google Fonts shortlist (with per-font metadata) and helpers
  for resolving a CSS font-family declaration to a vetted spec and for
  building a Google Fonts CSS2 stylesheet URL from a set of specs.

Catalog membership of modules and the actual rendering of module HTML/CSS
live in separate framework capabilities (the module catalog).
