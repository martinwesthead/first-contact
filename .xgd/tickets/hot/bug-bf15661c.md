---
uid: bug-bf15661c
id: BUG-6
type: bug
title: pnpm dev (control-app) crashes with ENOENT on wrangler dev-registry utime
created_by: xgd
created_at: '2026-06-19T23:50:20.799453+00:00'
updated_at: '2026-06-20T00:29:37.880997+00:00'
completed_at: null
last_field_updated: title
status: wont_fix
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
---

# pnpm dev (control-app) crashes with ENOENT on wrangler dev-registry utime

## Symptom

`pnpm dev` in `apps/control-app` starts the wrangler dev server successfully, serves requests, then crashes after several hot-reload cycles with:

```
Error: ENOENT: no such file or directory, utime '/Users/martin/Library/Preferences/.wrangler/registry/1stcontact-control-app'
    at utimesSync (node:fs:2186:11)
    at Timeout._onTimeout (.../wrangler@3.114.17/.../cli.js:155543:39)
```

## Root cause

This is a known bug in wrangler 3.x's local dev-registry housekeeping. Wrangler tracks running workers in `~/Library/Preferences/.wrangler/registry/` so multiple local workers can discover each other for service bindings. A timer periodically `utime`s those files to keep them alive. If the file is removed under the timer (registry cleanup race, another wrangler process exiting, manual cleanup), the next tick crashes the dev server.

Not a 1stcontact bug — it lives entirely in wrangler. Wrangler is currently pinned at 3.114.17; the latest is 4.103.0, and the dev startup banner warns the version is out of date.

## Reproduction

Run `pnpm dev` in `apps/control-app`, save source files repeatedly to trigger hot reloads. Crash is non-deterministic but reliably reproduces within minutes.

## Workarounds

1. Restart `pnpm dev` — the registry file is recreated on startup.
2. `rm -rf ~/Library/Preferences/.wrangler/registry/` then restart, if it recurs.
3. Upgrade wrangler to v4 — the registry bug is fixed there. Bigger change (potential config migration), not done as part of this ticket.

## Why won't_fix

- No code change in this repo will resolve it; the bug is in a pinned upstream dependency.
- Workaround #1 is trivial and effective for the immediate session.
- The durable fix (wrangler v4 upgrade) is a separate piece of work and should be tracked as its own ticket when it's prioritized, not bundled with this drive-by report.
