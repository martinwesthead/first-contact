---
uid: acceptance_criterion-46d964ac
id: AC-831
type: acceptance_criterion
title: 'Exhausted browser budget degrades gracefully: success with no screenshots
  and a budget-exhaustion note'
created_by: xgd
created_at: '2026-06-30T06:24:52.966404+00:00'
updated_at: '2026-06-30T06:24:52.966404+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-bab9b773
  kind: behavior
  regression_only: false
---

## Criterion
When the Browser Rendering budget is exhausted, the call still succeeds (no error) and returns a preview digest with no screenshots and a `whatsMissing` entry citing the exhausted budget — matching the degradation behavior of `analyze_page`.

## Verification
Invoke the tool with the browser budget pre-exhausted; assert the result is a successful `preview_digest`, that no screenshot references are present, and that a `whatsMissing` entry references the exhausted budget.
