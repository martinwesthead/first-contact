---
uid: acceptance_criterion-f1f5e7d8
id: AC-567
type: acceptance_criterion
title: robots.txt rules govern allow/disallow per origin with longest-match precedence
created_by: xgd
created_at: '2026-06-27T00:34:42.046495+00:00'
updated_at: '2026-06-27T00:34:42.046495+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a0482aed
  kind: behavior
  regression_only: false
---

## Criterion

A robots.txt check against a URL whose path is disallowed by the origin's robots.txt (matching the platform's user agent or the `*` fallback group) returns `{allowed:false, origin:<host>}`. A URL whose path is allowed (no matching disallow rule, or a longer matching allow rule wins over a shorter disallow rule) returns `{allowed:true}`.

Rules are resolved as follows:
- Longest-match wins between competing allow and disallow rules.
- On equal length, allow wins over disallow.
- A missing robots.txt (404 or network failure) is treated as "allow all".
- The robots rules for an origin are cached for 24 hours after the first lookup.

## Verification

With a stub fetch returning a robots.txt that disallows `/private/` for `*` and allows `/private/public-info`, run checks against multiple paths under the origin and assert:
- `/private/secret` returns `{allowed:false, origin:'example.com'}`.
- `/private/public-info` returns `{allowed:true}` (longer-match allow wins).
- A path outside any rule (`/about`) returns `{allowed:true}`.
- A second check against the same origin issues no new outbound robots fetch (rules cached).
