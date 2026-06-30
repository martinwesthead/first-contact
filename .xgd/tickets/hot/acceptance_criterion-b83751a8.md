---
uid: acceptance_criterion-b83751a8
id: AC-617
type: acceptance_criterion
title: analyze_page renders by default and returns a digest with rendered fetchPath,
  computed typography, and all three screenshot keys
created_by: xgd
created_at: '2026-06-28T19:58:02.159744+00:00'
updated_at: '2026-06-30T06:09:03.200169+00:00'
completed_at: null
last_field_updated: title
status: pending
fields:
  story_uid: story-15bae45e
  kind: behavior
  regression_only: false
---

## Criterion
`analyze_page` runs the Browser-Rendering (rendered) path on every call. There is no escalation heuristic and no `forceRendered` input gating it: for any reachable URL — static-rich or JS-SPA alike — the action runs `browser-budget gate → rendered driver → computed-signal merge → R2 screenshot upload` unconditionally. The returned digest carries `fetchPath: "rendered"`, computed typography that is resolved rather than `not_detected` (computed values win over the static-declared signals), and a `screenshotKeys` object populated with `mobile`, `tablet`, and `desktop` keys.

## Verification
Invoke `analyze_page` with an injected rendered-fetch driver against a content-rich (non-SPA) fixture. Assert the result status is `ok`, `payload.digest.fetchPath === "rendered"`, `payload.digest.signals.typography.body.family` is a concrete computed value (not the `not_detected` marker), and `payload.digest.screenshotKeys` has non-empty `mobile`, `tablet`, and `desktop` keys ending in `/{viewport}.png`.
