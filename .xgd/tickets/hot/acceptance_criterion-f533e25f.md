---
uid: acceptance_criterion-f533e25f
id: AC-694
type: acceptance_criterion
title: Guarded body-copy write reports success and rejects out-of-pattern keys
created_by: xgd
created_at: '2026-06-28T22:54:53.764863+00:00'
updated_at: '2026-06-28T22:54:53.764863+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ddc928fd
  kind: behavior
  regression_only: false
---

## Criterion
The operator-directed body-copy write accepts a key and markdown content; when the key matches the guarded `sites/{siteId}/copy/{slug}.md` pattern it persists the content as `text/markdown` and returns a success result reporting the key and the number of bytes written. A key outside that pattern is rejected with a failure result and the content is not written.

## Verification
Invoke the body-copy write with a valid `sites/x/copy/y.md` key and assert it returns a success result reporting the key and a positive byte count, and that the stored file contains the supplied markdown. Invoke it with a key outside the pattern and assert it returns a failure and writes nothing.