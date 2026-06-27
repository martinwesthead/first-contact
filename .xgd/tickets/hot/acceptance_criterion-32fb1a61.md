---
uid: acceptance_criterion-32fb1a61
id: AC-573
type: acceptance_criterion
title: Safety diagnostic endpoint returns the calling account's rate-limit state
created_by: xgd
created_at: '2026-06-27T00:35:32.858311+00:00'
updated_at: '2026-06-27T00:35:32.858311+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a0482aed
  kind: behavior
  regression_only: false
---

## Criterion

`GET /api/_safety/health` returns HTTP 200 with a JSON body of shape:

```
{
  "account_id": <string>,
  "windows": {
    "hour":  { "count": <integer>, "resets_at": <unix-seconds> },
    "day":   { "count": <integer>, "resets_at": <unix-seconds> },
    "burst": { "count": <integer>, "resets_at": <unix-seconds> }
  }
}
```

The `account_id` echoes the calling account (resolved from request context; default `"anonymous"` when not declared). The three window objects reflect the current state of the hour, day, and burst counters for that account.

Non-GET methods on this path return HTTP 405 with a JSON error body.

## Verification

- `GET /api/_safety/health` with no account header: 200, body's `account_id` is `"anonymous"`, all three window counts are 0 (no fetches yet).
- After performing N rate-limit checks for account `acct-1`, a subsequent `GET /api/_safety/health` with `x-account-id: acct-1` reflects `windows.hour.count >= N` and `windows.day.count >= N`.
- `POST /api/_safety/health` returns 405 with a JSON `{error: ...}` body.
