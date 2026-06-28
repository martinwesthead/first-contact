---
uid: acceptance_criterion-1b052903
id: AC-618
type: acceptance_criterion
title: Browser-Rendering budget exhaustion degrades analyze_page to the static path
  without failing the action
created_by: xgd
created_at: '2026-06-28T19:58:06.140118+00:00'
updated_at: '2026-06-28T19:58:06.140118+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-15bae45e
  kind: behavior
  regression_only: false
---

## Criterion
When escalation would fire but the per-session Browser-Rendering budget is exhausted, `analyze_page` falls back to the static-fetch path: the returned digest is marked `fetchPath: "static"`, its `whatsMissing` commentary includes an entry citing that the Browser-Rendering budget was exhausted for the session, and the action still returns a successful result. The call does NOT return a failure (`status` is `ok`, not `failed`).

## Verification
Invoke `analyze_page` with the session browser-budget counter pre-seeded to the configured session maximum (so the budget gate reports exhausted), against an escalation-eligible fixture. Assert `result.status === "ok"`, `payload.digest.fetchPath === "static"`, and that `payload.digest.commentary.whatsMissing` contains an entry naming the exhausted Browser-Rendering budget.
