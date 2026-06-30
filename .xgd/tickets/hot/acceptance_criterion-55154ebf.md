---
uid: acceptance_criterion-55154ebf
id: AC-829
type: acceptance_criterion
title: 'Unresolvable compareToDigestId is non-fatal: digest returned with no inspirationDelta
  and a whatsMissing note'
created_by: xgd
created_at: '2026-06-30T06:24:36.316535+00:00'
updated_at: '2026-06-30T06:24:36.316535+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-bab9b773
  kind: behavior
  regression_only: false
---

## Criterion
When `compareToDigestId` is supplied but does not resolve to any cached reference digest, the tool still succeeds: it returns the preview digest with `inspirationDelta` absent and adds a `whatsMissing` entry indicating the supplied id could not be resolved. No error is raised.

## Verification
Invoke the tool with a `compareToDigestId` that matches no cached digest; assert the result is a successful `preview_digest`, that `inspirationDelta` is absent, and that `whatsMissing` contains an entry referencing the unresolved id.
