---
uid: acceptance_criterion-00423fbe
id: AC-830
type: acceptance_criterion
title: No Browser Rendering available degrades to structural signals from the draft,
  not an empty digest
created_by: xgd
created_at: '2026-06-30T06:24:40.353697+00:00'
updated_at: '2026-06-30T06:24:40.353697+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-bab9b773
  kind: behavior
  regression_only: false
---

## Criterion
When visual capture is unavailable because no Browser Rendering capability is configured for the environment, the tool still returns a preview digest that reflects the draft's actual structure — its real headings, section count, and asset inventory extracted from the rendered draft — rather than an all-empty "not detected" digest. The digest is marked as a static (degraded) fetch, carries no screenshots, and its first `whatsMissing` entry states that the Browser Rendering binding is not configured.

## Verification
Invoke the tool with the Browser Rendering capability absent on a draft with content modules; assert the digest's `fetchPath` is the static/degraded value, its content signals contain the draft's actual headings, no screenshot references are present, and the first `whatsMissing` entry cites the missing Browser Rendering binding.
