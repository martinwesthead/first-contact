---
uid: acceptance_criterion-1bbf5d73
id: AC-709
type: acceptance_criterion
title: Site validator enforces nav cross-references and unique labels regardless of
  entry point
created_by: xgd
created_at: '2026-06-28T23:53:48.374108+00:00'
updated_at: '2026-06-28T23:53:48.374108+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e893e643
  kind: behavior
  regression_only: false
---

## Criterion
The site-definition validator itself rejects a site whose nav entries reference an unknown page id, reference an unknown anchor module id, or contain duplicate labels — not only when the edit arrives via `set_nav_entries`. Any code path that produces such a site is rejected.

## Verification
Validate a hand-constructed site definition that contains an orphan nav page target (and separately, duplicate nav labels) directly through the validator and assert it reports the corresponding cross-reference / duplicate-label errors.