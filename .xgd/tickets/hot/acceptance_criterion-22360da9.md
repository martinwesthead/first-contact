---
uid: acceptance_criterion-22360da9
id: AC-558
type: acceptance_criterion
title: Redirects re-validate the target on every hop
created_by: xgd
created_at: '2026-06-27T00:33:34.641720+00:00'
updated_at: '2026-06-27T00:33:34.641720+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a0482aed
  kind: behavior
  regression_only: false
---

## Criterion

When a fetch's response is a 3xx redirect, the safety contract resolves the new location, validates it against the full SSRF + scheme contract, and only follows the redirect if the new target passes. A redirect from a public URL to an SSRF-blocked host (e.g. a 301 from `https://example.com/x` to `http://127.0.0.1/`) is rejected at the redirect hop with reason `private_ip` (carrying the SSRF detail), not with a redirect-success status.

A plain-HTTP same-origin approval granted for the original fetch does NOT carry across redirect hops — each hop is re-validated as if it were a brand-new fetch.

## Verification

With a controlled `fetchImpl` that returns a 301 → `http://127.0.0.1/` from `https://example.com/x`, attempt the fetch and assert the result is `{ok:false, reason:'private_ip', detail:'loopback'}` and that the loopback URL was never requested.
