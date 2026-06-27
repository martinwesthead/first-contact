---
uid: acceptance_criterion-b12d81c8
id: AC-597
type: acceptance_criterion
title: Every page is analyzed via the static path; rendered-path escalation never
  triggers in this version
created_by: xgd
created_at: '2026-06-27T01:11:26.883539+00:00'
updated_at: '2026-06-27T01:11:26.883539+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-3f73931a
  kind: behavior
  regression_only: true
---

## Criterion
The static-only escalation decision always reports "do not escalate" for any digest in this version. The Browser Rendering (rendered) fetch path is out of scope for this REQ; the escalation point exists as a wired integration hook (REQ-22 replaces its decision logic) but never selects the rendered path here, so analysis stays on the static fetch path for every input.

## Verification
Invoke the escalation decision against a range of digests — fully-populated, sparse, and empty → assert it reports "do not escalate" (static path) in every case.
