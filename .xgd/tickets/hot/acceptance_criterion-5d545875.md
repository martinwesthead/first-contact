---
uid: acceptance_criterion-5d545875
id: AC-789
type: acceptance_criterion
title: Rendered fetch captures @font-face web-font URLs as font assets
created_by: xgd
created_at: '2026-06-30T01:26:36.313326+00:00'
updated_at: '2026-06-30T01:26:36.313326+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-3f73931a
  kind: behavior
  regression_only: false
---

## Criterion
When the rendered fetch runs against a page that declares `@font-face` web fonts — whether the font-face rules are exposed through `document.styleSheets` (`CSSFontFaceRule` entries) or registered dynamically through the `document.fonts` Font Loading API — every font-file `url()` it declares is folded into the digest's asset inventory as a `kind: 'font'` record. Each record carries the font-file URL resolved to an absolute URL (against the rendered page's URL) and, when known, the originating font family recorded on the record. URLs are deduped by absolute URL: a URL already present in the inventory has its `references` count incremented and keeps its original `kind` rather than producing a duplicate record, while a genuinely new URL is appended with `references` = 1. `data:` font URLs are excluded. A static-only digest (no rendered pass) gains no `kind: 'font'` records from this path.

## Verification
Run the computed-signal merge with rendered font assets containing (a) a web-font url() with a known family, (b) a url() duplicating one already in the inventory, and (c) a `data:` font URL → assert the inventory gains exactly one `kind: 'font'` record for (a) with an absolute URL and its family recorded, the duplicate (b) increments the existing record's `references` (no new row, original `kind` retained), and the `data:` URL (c) is absent. Run the merge with no font assets → assert no `kind: 'font'` records are added.
