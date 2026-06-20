---
uid: request-e574ffb1
id: REQ-46
type: request
title: 'Headless-only Claude permissions: allow xgd ticket create/list/get'
created_by: xgd
created_at: '2026-06-20T22:48:10.354985+00:00'
updated_at: '2026-06-20T23:05:25.512926+00:00'
completed_at: null
last_field_updated: title
status: draft
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
---

## Intent

Configure a Claude Code permissions file that grants exactly three `xgd ticket` commands without a per-call prompt, but **only** when loaded by a deliberate headless invocation in this project. It must NOT apply to:

- interactive `claude` run from the command line in this project, or
- the XGD-orchestrated headless Claude (`xgd claude` sessions), which has its own permission model.

## Mechanism

Claude Code's settings hierarchy is driven by file location, not invocation mode. A file at `.claude/settings.json` is auto-loaded by every Claude invocation whose CWD is inside the project — which would catch both modes we want to exclude. So we use a **non-auto-loaded** file and require the headless invocation to opt in explicitly via the `--settings` flag.

## What changes

Create `/Users/martin/Projects/first-contact/.claude/headless-settings.json` with an allow-list of exactly three commands:

- `Bash(xgd ticket create:*)`
- `Bash(xgd ticket list:*)`
- `Bash(xgd ticket get:*)`

This file is *not* at any auto-loaded path (`.claude/settings.json` or `.claude/settings.local.json`). Interactive `claude` and `xgd claude` will ignore it. Any future headless launcher we build for this project loads it via:

```
claude --settings /Users/martin/Projects/first-contact/.claude/headless-settings.json \
       --setting-sources project,local,user \
       -p "..."
```

Or to load *only* this file with no merge from user/global settings:

```
claude --settings .claude/headless-settings.json --setting-sources "" -p "..."
```

## Out of scope

- No auto-loaded `.claude/settings.json` is created (the earlier one was removed).
- No edits to `~/.claude/settings.json`.
- No launcher script/wrapper is created in this ticket — that's a separate piece of work once you've decided the invocation pattern.
- No grant for `xgd ticket update`, `xgd ticket comment`, or any non-ticket `xgd` subcommand.

## Acceptance

- `.claude/headless-settings.json` exists with the three allow entries above.
- Interactive `claude` in this project does NOT auto-load it (no `.claude/settings.json` exists).
- A headless `claude --settings .claude/headless-settings.json -p "xgd ticket create ..."` runs without a permission prompt for those three commands.
