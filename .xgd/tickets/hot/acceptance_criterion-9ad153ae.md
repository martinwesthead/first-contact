---
uid: acceptance_criterion-9ad153ae
id: AC-568
type: acceptance_criterion
title: Per-chat robots override unblocks an origin without affecting other chats
created_by: xgd
created_at: '2026-06-27T00:34:46.551300+00:00'
updated_at: '2026-06-27T00:34:46.551300+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a0482aed
  kind: behavior
  regression_only: false
---

## Criterion

When the caller passes a per-chat override list containing an origin that is otherwise disallowed by that origin's robots.txt, the robots check for that origin returns `{allowed:true}`. The override applies only to the call passing that list — a separate chat's check (without the override) against the same origin still returns `{allowed:false, origin:<host>}`.

There is no global ignore-robots toggle and no per-account persistent override.

## Verification

With a robots.txt that disallows `/` for `*`:
- Check `https://example.com/x` without override: returns `{allowed:false, origin:'example.com'}`.
- Check the same URL with override list `['example.com']`: returns `{allowed:true}`.
- Check the same URL without override on a second call (representing a sibling chat): returns `{allowed:false, origin:'example.com'}` again.
