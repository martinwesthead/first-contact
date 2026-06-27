---
uid: acceptance_criterion-03f1f9ac
id: AC-604
type: acceptance_criterion
title: Digest commentary is produced by the AI pass, with a deterministic fallback
  that never fails analysis
created_by: xgd
created_at: '2026-06-27T01:26:07.670966+00:00'
updated_at: '2026-06-27T01:26:07.670966+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-15bae45e
  kind: behavior
  regression_only: false
---

## Criterion
The digests summary and whats-missing commentary are produced by an AI commentary pass when a model key is configured. When no model key is configured, or the model call returns a non-success response or unparseable output, the action still returns a complete digest containing a deterministic summary (describing heading/image/background/video counts and source URL) and the baseline whats-missing list derived from the signals. Analysis never fails because of the commentary pass.

## Verification
Run the action (1) with no model key → digest returned with the deterministic fallback summary and baseline whats-missing; (2) with a model key but a stubbed non-2xx / malformed model response → same deterministic fallback; (3) with a stubbed valid model JSON response → digest summary/perSection/whatsMissing reflect the model output.
