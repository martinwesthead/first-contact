---
uid: request-3569243c
id: REQ-15
type: request
title: 'Responsive dials: per-breakpoint values across all dials + framework + validator
  + tool surface'
created_by: xgd
created_at: '2026-06-16T22:12:10.709423+00:00'
updated_at: '2026-06-16T22:12:10.709423+00:00'
completed_at: null
last_field_updated: created_at
status: draft
fields:
  priority: medium
  story_points: 6
  auto_merge_back: true
  needs_review: false
---

## Scope

Make **all dials in the framework responsive** — every dial accepts either a single value (current behaviour, applies at all breakpoints) or a breakpoint-keyed object (different values per mobile / tablet / desktop). Updates [[DOC-7]] §3 module contract, the site-schema validator, the framework's CSS generation, and the AI tool surface for setting dials.

After this REQ: an AI tool call like `set_module_dial(instance_id, 'spacingTop', { mobile: 'sm', desktop: 'lg' })` produces a module rendered with different spacing at the mobile and desktop breakpoints. Existing scalar dial values continue to work unchanged (forward-compatible). The framework emits per-breakpoint CSS classes; the validator validates per-breakpoint values against the same dial enum; the AI's tool schema describes the per-breakpoint structure inline.

Design discussion: in-app feedback from Claude running in the builder identified responsive dials as missing — current model is "single value" with no way to say "smaller on mobile." Operator chose "across everything" (not per-dial opt-in) — every dial becomes potentially responsive without per-module opt-in in `moduleMeta`.

## Why free-coded

Substantive but bounded framework change. Touches DOC-7 module contract (one section), the schema/validator, framework CSS generation, and the tool surface. No new architectural category — extends an existing primitive.

## Dependencies

- [[REQ-3]] — site-schema validator (dial value shape extended).
- [[REQ-4]] — framework theme tokens + module registry + chrome modules (CSS generation needs per-breakpoint awareness).
- [[REQ-5]] — content modules (every module that exposes dials needs to honour per-breakpoint class output).
- [[REQ-8]] — tool dispatch path.

## Deliverables

### DOC-7 amendment

Update [[DOC-7]] §3 (Module Contract) and §4 (Theme Token System):

- §3.2 contract rule 1 updated: "All variants and dials are finite enumerations. **A dial value MAY be either a single enum value or a breakpoint-keyed object `{ mobile: V, tablet?: V, desktop?: V }` where every value V is a valid enum entry.**"
- §4.1 augmented: explains the precedence order (`mobile` is the base; `tablet` and `desktop` override at their breakpoints; missing levels inherit from below).
- §4.2 Implementation gets a paragraph on per-breakpoint CSS class emission.

### Site-schema validator (`packages/site-schema`)

Dial value type updated:

```typescript
type DialValue<E extends readonly string[]> =
  | E[number]
  | { mobile: E[number], tablet?: E[number], desktop?: E[number] }
```

Validator updates:

- Single value: validated against `moduleMeta.dials[name]` enum as today.
- Object value: every present key validated against the same enum; `mobile` required (the base); `tablet` and `desktop` optional.
- Reject empty object; reject objects with unknown keys (e.g. `{ phone: ... }`).
- Reject malformed shapes (e.g. arrays, nested objects).

UATs cover both shapes.

### Framework CSS generation (`packages/framework`)

Each module emits class names per breakpoint:

- Single-value dial: emits `<dial>-<value>` class (current behaviour, unchanged).
- Object-value dial: emits `<dial>-mobile-<v>` always; `<dial>-tablet-<v>` if present; `<dial>-desktop-<v>` if present.

The framework's CSS file (the per-site generated CSS from [[DOC-7]] §4.2) gains responsive rule blocks:

```css
.size-mobile-sm { ... }
@media (min-width: 768px) { .size-tablet-md { ... } }
@media (min-width: 1024px) { .size-desktop-lg { ... } }
```

Breakpoints come from the existing token contract (`breakpoints.sm`, `.md`, `.lg`).

**Important: existing per-dial CSS rules continue to work.** This REQ adds the responsive rule set; it does not break the scalar rules. Modules that only ever receive scalar dial values look exactly as they did before.

### Tool surface updates

`set_module_dial` updated to accept the extended dial value:

```
input: {
  instance_id: string,
  dial:        string,
  value:       string | { mobile: string, tablet?: string, desktop?: string }
}
```

Tool description in the system prompt explains the two shapes and the precedence rule. AI's first-call validity rate stays high because the description spells out exact enum values per dial via [[REQ-3]]'s framework-catalog injection.

Also impacts `duplicate_module` from the tool-surface-completion REQ — duplicates preserve responsive structure.

### Module updates (existing modules need per-breakpoint awareness)

Every shipped module from [[REQ-4]] and [[REQ-5]] gets a small update:

- Astro component's `class:list` directive emits the per-breakpoint class set (not just the scalar class).
- A shared helper `dialClasses(dialName, value)` returns the correct class list given either input shape — modules call this for every dial they render.

The work is mechanical once `dialClasses` exists. Hero, photo-text, services-grid, text-block, contact-form all updated.

### UATs (`test_UAT_FC_<REQ-ID>_*`)

- `scalar_dial_value_still_works` — existing module with scalar dial values renders identically pre- and post-REQ.
- `responsive_dial_emits_three_classes` — module with object-value dial emits mobile + tablet + desktop classes.
- `responsive_dial_with_only_mobile_and_desktop_omits_tablet` — partial object value emits only the keys that were set.
- `set_module_dial_accepts_object_value` — tool call with object value applies cleanly.
- `validator_rejects_unknown_breakpoint_key` — object with `{ phone: 'sm' }` rejected with structured error.
- `validator_rejects_invalid_enum_in_object` — object with `{ mobile: 'cirle' }` (typo) rejected.
- `validator_requires_mobile_in_object` — object missing `mobile` rejected.
- `framework_css_generation_emits_responsive_blocks` — generated per-site CSS contains expected media-query blocks for each set token combination.
- `dialclasses_helper_returns_correct_classes` — direct unit-test of the shared helper for scalar and object inputs.

## Out of scope

- Custom breakpoints (operator-defined breakpoints beyond mobile/tablet/desktop) — v1 uses the three standard breakpoints from the token contract.
- Container queries — v1 uses media queries; CQ migration is a future polish REQ.
- Per-instance breakpoint override (e.g. "this module uses different breakpoints than the rest of the site") — out of scope; one breakpoint set per site.
- AI UX guidance on when to choose responsive dials — handled by system-prompt examples in [[REQ-A+B]] (state-visibility REQ) at a later iteration.
- Variant responsiveness — variants remain scalar (a module is one variant; responsive variant switching is unusual and adds complexity disproportionate to value).

## Risks / open items

- **CSS bundle size** — emitting three classes per dial per module bumps the generated per-site CSS. For a site with 10 modules each touching 6 dials, that's ~180 rules. Acceptable; gzip handles repetition well. Monitor.
- **Module rendering churn** — every existing module gets touched. Coordinate with whatever REQ-4/5 is doing if they're in flight.
- **AI tool description size** — the schema for `set_module_dial` doubles in description length. Acceptable per [[REQ-9]]'s 8K-token tool spec budget; monitor.
- **Validator subtlety** — `mobile` is required in object form. If the AI emits an object with only `desktop`, that's rejected with a structured error explaining the requirement. AI self-corrects.
