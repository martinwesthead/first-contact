---
uid: story-d44dfd7c
id: STORY-68
type: story
title: Dev-only xgd_ticket tool for the builder chat AI
created_by: xgd
created_at: '2026-06-30T01:10:01.079427+00:00'
updated_at: '2026-06-30T01:10:01.079427+00:00'
completed_at: null
last_field_updated: created_at
status: unplanned
fields:
  intent_uid: bundle-30021526
  capability_uid: capability-2e2c9a0a
  story_kind: feature
  story_points: 3
---

## Story
**As a** developer operating the 1st Contact builder, **I want** the builder chat AI to run a constrained set of `xgd ticket` commands against my local first-contact project, **so that** I can list, read, and file project tickets from the chat panel during development — while customers never see or reach this capability.

## Description
Exposes a single dev-only tool, `xgd_ticket`, to the builder chat AI. The tool accepts a `command` restricted to the allowlist `{create, list, get}` plus an optional `args` array of strings appended as argv tokens after the subcommand. There is no raw shell pass-through.

Because the chat handler runs in Cloudflare Workers (no `child_process`), the actual CLI is spawned by a localhost sidecar process. The Workers-side action validates the request and forwards it over HTTP to the sidecar; the sidecar re-validates, spawns `xgd ticket <command> <args>` in the developer's project directory, and returns the command's stdout, stderr, and exit code. That output is surfaced back to the AI's next turn so it can act on results.

**In scope:** the `xgd_ticket` tool surfaced to the AI; the command allowlist and argv construction; the localhost sidecar HTTP contract (command allowlist + working-directory guard); dev-only visibility gating with a defence-in-depth re-check; structured success/failure surfacing.

**Out of scope:** `xgd ticket update`/`comment` or any non-ticket `xgd` subcommand; production deployment of the sidecar (it exists only on the developer's machine); any wrapper CLI under `bin/`; edits to global Claude Code settings.

## Technical Context
- The tool is registered as a system action in the operator action namespace (shared with the customer-facing Operator API, CAP-52's parent dispatch). Visibility is filtered out unless the dev-tools environment flag is `"true"`; the handler re-checks the same flag itself so a forced invocation still fails closed without contacting the sidecar.
- The sidecar binds only to `127.0.0.1` (default port 7878, overridable), so production chat sessions — which cannot reach localhost — never exercise it.
- The sidecar's working-directory guard compares resolved path segments against the allowed project root (not a prefix-substring test), so a sibling directory whose name merely shares the prefix is rejected.
- **Code/intent divergence (flag for regression):** the intent names the default xgd binary as `~/Projects/xgendev-main/.venv-xgendev-main/bin/xgd`; the sidecar's start script defaults to `~/Projects/xgendev-main/.venv-working/bin/xgd`. Both are env-overridable (`XGD_BIN`), so this is a default-value drift, not a behavioral AC.
- Real CLI spawning is exercised by a local smoke test only; CI coverage injects a spawn function, so the sidecar's allowlist and cwd guard are verified without spawning.

## Dependencies
None.

## Story Points
3
