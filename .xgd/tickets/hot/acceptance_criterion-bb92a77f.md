---
uid: acceptance_criterion-bb92a77f
id: AC-809
type: acceptance_criterion
title: Reading a reference doc with a section narrows the body to that section, falling
  back to the full body when not found
created_by: xgd
created_at: '2026-06-30T04:17:12.232830+00:00'
updated_at: '2026-06-30T04:17:12.232830+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-721e8feb
  kind: behavior
  regression_only: false
---

## Criterion
Requesting a reference doc by slug with a section parameter returns the document
with its body narrowed to the content of the named section (the section heading
through to the next same-level heading or end of document) rather than the full
body. If the named section is not found in the document, the full body is
returned instead (the request still succeeds).

## Verification
Seed a multi-section reference doc; request it with a valid section and assert
the returned body contains only that section's content and excludes other
sections. Request it with a section name that does not exist and assert the
response succeeds and returns the full body.
