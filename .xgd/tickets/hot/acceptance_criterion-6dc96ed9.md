---
uid: acceptance_criterion-6dc96ed9
id: AC-391
type: acceptance_criterion
title: Valid minimal site validates and narrows to typed Site
created_by: xgd
created_at: '2026-06-25T00:38:31.193838+00:00'
updated_at: '2026-06-25T00:38:31.193838+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-aecb7377
  kind: behavior
  regression_only: false
---

## Criterion

`validateSite(input)` returns `{ ok: true, value }` when given a
minimal-but-complete site definition (one page, one module, all
required theme-token slots, a nav config). The returned `value`
narrows to the `Site` type at compile time so callers can read
`value.pages[0].modules[0].type` without further parsing.

## Verification

Pass a minimal site object to `validateSite()` and assert:
- the result is the success branch (`ok` is true);
- the value exposes the populated `pages` array;
- TypeScript narrowing on the success branch yields the `Site`
  type (compile-time check via `expectTypeOf`).
