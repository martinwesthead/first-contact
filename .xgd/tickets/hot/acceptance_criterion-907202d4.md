---
uid: acceptance_criterion-907202d4
id: AC-647
type: acceptance_criterion
title: Download failures surface a named reason and write nothing to storage
created_by: xgd
created_at: '2026-06-28T20:40:21.904962+00:00'
updated_at: '2026-06-28T20:40:21.904962+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-5d1952ba
  kind: behavior
  regression_only: false
---

## Criterion
When an asset cannot be mirrored, the operation returns a failure outcome carrying the source URL and a stable reason name, and does not write any object to storage. The reason taxonomy is: a body over the safety-layer size cap → `body_too_large`; SSRF-class rejects (private address, disallowed scheme, too many redirects, and related) → `ssrf_blocked`; robots disallowed without an override → `requires_robots_override`; rate-limit exhaustion → `rate_limited`; a non-2xx response → `non_2xx` (with the status in the detail); and a non-http(s) URL is rejected as `unsupported_scheme` without ever invoking the fetch.

## Verification
Drive the mirror operation with an injected safe-fetch stub that returns each failure reason, plus a stub that returns a 404 and one fed a `data:` URL. Assert each call returns a failure outcome with the expected reason name; for the non-2xx case assert the detail names the status; for the unsupported-scheme case assert the fetch stub was never called; and after the non-2xx case assert the bucket contains zero objects.
