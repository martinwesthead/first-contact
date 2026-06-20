---
uid: request-e574ffb1
id: REQ-46
type: request
title: 'Project-level Claude permissions: allow xgd ticket create/list/get'
created_by: xgd
created_at: '2026-06-20T22:48:10.354985+00:00'
updated_at: '2026-06-20T22:50:53.098843+00:00'
completed_at: null
last_field_updated: title
status: draft
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
---

## Intent

Configure Claude Code permissions so that — when working in this project — Claude may run a limited set of `xgd ticket` commands without a per-call permission prompt. Scope is enforced automatically by the file's location in the project repo (`.claude/settings.json`).

## What changes

Create `/Users/martin/Projects/first-contact/.claude/settings.json` with an allow-list permitting exactly three commands:

- `Bash(xgd ticket create:*)` — create tickets in this project
- `Bash(xgd ticket list:*)` — list tickets
- `Bash(xgd ticket get:*)` — read a ticket by id/uid

All other `xgd` subcommands (update, move-to-free-coded, revert, develop, reconcile, etc.) remain subject to the normal permission flow.

## Why "constrained to this project"

Project-level `.claude/settings.json` is loaded by Claude Code only when the working directory is inside this project. User-level (`~/.claude/settings.json`) would apply globally; we are deliberately not touching that file.

## Out of scope

- No code changes, no test changes — this is a configuration file under FREE-CODING.md's documented exception (settings files do not require the free-coding lifecycle).
- No global/user-level settings edits.
- No grant for `xgd ticket update`, `xgd ticket comment`, or any non-ticket `xgd` subcommand.

## Acceptance

- `.claude/settings.json` exists with the three allow entries above.
- A subsequent `xgd ticket create` / `list` / `get` invocation by Claude in this project runs without a permission prompt.
- Running the same commands in a different project (no project-level settings) continues to prompt as before.
