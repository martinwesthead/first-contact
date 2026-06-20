---
uid: request-e7328950
id: REQ-44
type: request
title: 'Module: services-grid@v2 (upgrade existing)'
created_by: xgd
created_at: '2026-06-20T21:15:17.398197+00:00'
updated_at: '2026-06-20T23:44:36.494038+00:00'
completed_at: null
last_field_updated: body
status: free_coded
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
  fields.implementation_plan: 'Bump services-grid to v2 in place. Renames: items[].icon
    → items[].image (asset-ref only, no string fallback), items[].title → items[].heading.
    Add one-col variant; add imageStyle dial (icon|cover|thumb); items min lowered
    from 2 to 1 for one-col use. Update render/browser.ts, starter-site JSON, and
    llm-context docs to match. Existing REQ-5 tests updated to new contract; new REQ-44
    UATs cover image asset-ref, imageStyle dial, and one-col rendering.'
  commits:
  - bcee4ed7f869daa7f2c00628bd2eee4293b5cf3b
  version: 0.0.25
  fields.commits:
  - 83a8041bf92eee0ee71eb5a69b63ae68c08001ce
---

The current `services-grid@v1` is text-only. This upgrade adds per-item images and a CTA, making it viable for real service showcases.

- **Variants:** `three-col`, `two-col`, `one-col` (add one-col for feature callouts)

- **Dials:** same as v1 plus:

- `imageStyle`: `icon`, `cover`, `thumb` (controls how the image is sized within the card)

- **Content fields:**

- `heading` — string

- `items[]` — array of:

- `image` — asset-ref (optional)

- `heading` — string

- `body` — markdown

- `cta` — `{ label, href }` (optional)



---

## Reconciliation note (commit hygiene)

Two commits land for this ticket:

- `bcee4ed7f869daa7f2c00628bd2eee4293b5cf3b` — implementation + tests (the v2 module, SSR renderer, starter-site migration, REQ-5 test updates, four new REQ-44 UATs).
- `83a8041bf92eee0ee71eb5a69b63ae68c08001ce` — version bump 0.0.24 → 0.0.25.

The first version-bump commit (`208ee0c`) was discarded via `git reset --soft HEAD~1` because a concurrent session staged unrelated REQ-46 dev-tools-server files (`tools/dev-tools-server/*`, `test_UAT_FC_REQ-46_*`) into the index between my `git status` snapshot and `git commit` call. Reconcile should not look for `208ee0c` — only the two SHAs above are valid for REQ-44.

The fact that the soft-reset succeeded cleanly (`83a8041` shows only the package.json delta) means no REQ-44 content was lost; those REQ-46 files simply returned to untracked state for whoever owns that scope to commit themselves.

## LLM context doc note

The convert-flow doc bullet for `services-grid` items (`{ heading, body, image?, cta? }` + `imageStyle` dial guidance) landed in `docs/llm-context/reproducing-a-website.md` and the inlined `apps/control-app/src/llm-context.ts` mirror via a parallel-session sweep before my own commits — it is not in `bcee4ed` but it IS in HEAD when the reconcile runs. If reconcile diffs against the pre-REQ-44 baseline it may attribute that line to REQ-43 or REQ-47; the canonical owner is REQ-44.