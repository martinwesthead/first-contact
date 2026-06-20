---
uid: request-e7328950
id: REQ-44
type: request
title: 'Module: services-grid@v2 (upgrade existing)'
created_by: xgd
created_at: '2026-06-20T21:15:17.398197+00:00'
updated_at: '2026-06-20T23:32:58.501189+00:00'
completed_at: null
last_field_updated: fields.commits
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