---
uid: acceptance_criterion-7f116ca1
id: AC-557
type: acceptance_criterion
title: Plain HTTP fetch requires same-origin operator approval
created_by: xgd
created_at: '2026-06-27T00:33:28.555378+00:00'
updated_at: '2026-06-27T00:33:28.555378+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a0482aed
  kind: behavior
  regression_only: false
---

## Criterion

A fetch with the `http:` scheme is rejected with reason `disallowed_scheme` unless the caller declares an HTTPS origin previously approved for plain-HTTP fetching in the same chat session, AND the HTTP target's origin (scheme + host + port) is the HTTPS equivalent of that approved origin. Approval for a different origin or for a different path is not sufficient.

## Verification

Attempt `http://` fetches under three conditions and assert the outcomes:
- No HTTPS approval declared: rejected with `disallowed_scheme` (detail indicating http not allowed).
- HTTPS approval declared for `https://example.com` and target is `http://example.com/x`: allowed (passes validation).
- HTTPS approval declared for `https://example.com` and target is `http://other.com/x`: rejected with `disallowed_scheme` (detail indicating origin mismatch).
