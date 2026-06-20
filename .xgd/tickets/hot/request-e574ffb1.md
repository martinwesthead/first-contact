---
uid: request-e574ffb1
id: REQ-46
type: request
title: 'Dev tool: AI can run xgd ticket create/list/get in this project'
created_by: xgd
created_at: '2026-06-20T22:48:10.354985+00:00'
updated_at: '2026-06-20T23:34:06.718601+00:00'
completed_at: null
last_field_updated: venv_path
status: draft
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
  venv_path: /Users/martin/Projects/xgendev-main/.venv-working/bin/xgd
  progress: step_1_sidecar_complete
  commits:
  - 3484fb12ab1426fa3e23084288ac586307a1b9da
---

## Intent

Add a new system-action tool to the builder chat so the Anthropic-API-driven AI can run a constrained set of `xgd ticket` commands against this project (`~/Projects/first-contact`) using the xgd implementation at `~/Projects/xgendev-main`. The tool is **dev-only** and gated off in production.

## What the AI sees

One tool, `xgd_ticket`, with `input_schema`:

```json
{
  "type": "object",
  "properties": {
    "command": { "type": "string", "enum": ["create", "list", "get"] },
    "args":    { "type": "array",  "items": { "type": "string" } }
  },
  "required": ["command"]
}
```

Three commands only. Any other value of `command` → handler returns a structured error without invoking xgd. No raw shell pass-through; `args` is built into argv as `["ticket", command, ...args]`.

## Architecture (why this isn't a one-file change)

The chat handler lives in Cloudflare Workers (`apps/control-app`, via `wrangler dev`/`wrangler deploy`). Workers has no `child_process`, so the handler cannot directly spawn `xgd`. The split:

- **Sidecar** (new) — `tools/dev-tools-server/` — small Node HTTP server bound to `127.0.0.1`. Endpoint `POST /xgd-ticket` accepts `{command, args}`. It validates `command ∈ {create, list, get}` again (defence in depth), spawns the venv `xgd` with `cwd=~/Projects/first-contact`, and returns `{ok, stdout, stderr, exitCode}`.
- **Handler** (new file in `apps/control-app/src/operator/`) — fetches `http://127.0.0.1:${PORT}/xgd-ticket`, surfaces the result through the existing `ActionResult` shape.
- **Registration** — handler appended to `SYSTEM_ACTIONS` in `apps/control-app/src/operator/registry.ts`, **gated** so the spec is only included when `env.DEV_TOOLS_ENABLED === "true"`. `visibleToolSpecs(planTier)` will skip it otherwise.

### Defaults (taking the recommended defaults since you didn't override)

- **Venv**: `~/Projects/xgendev-main/.venv-xgendev-main/bin/xgd` (configurable via env var `XGD_BIN` on the sidecar; default to the venv path above).
- **Project cwd**: `~/Projects/first-contact` (configurable via env var `XGD_CWD`; default to that path; sidecar refuses to run if cwd is outside `~/Projects/first-contact`).
- **Sidecar port**: `127.0.0.1:7878` (configurable; never binds 0.0.0.0).
- **Gating**: `env.DEV_TOOLS_ENABLED === "true"` on the Worker side.

## Tests (FREE-CODING UAT names)

All UATs named `test_UAT_FC_REQ-46_*.test.ts` under `tests/`:

1. `test_UAT_FC_REQ-46_xgd_ticket_tool_invisible_in_prod` — DEV_TOOLS_ENABLED unset → `visibleToolSpecs("trial")` does not include `xgd_ticket`.
2. `test_UAT_FC_REQ-46_xgd_ticket_tool_visible_when_dev_enabled` — DEV_TOOLS_ENABLED=true → tool appears in `visibleToolSpecs`.
3. `test_UAT_FC_REQ-46_xgd_ticket_rejects_unknown_command` — handler called with `command: "delete"` returns `{status: "failed", error: <message naming the allowed set>}` and does NOT call the sidecar.
4. `test_UAT_FC_REQ-46_xgd_ticket_create_routes_to_sidecar` — handler called with `{command:"create", args:["--type","note","--title","X"]}` issues a POST to the sidecar URL with the correct JSON body (injected `fetch` records it); returns the sidecar's parsed result as `ActionResult{status:"ok"}`.
5. `test_UAT_FC_REQ-46_xgd_ticket_propagates_sidecar_failure` — sidecar returns non-2xx → handler returns `ActionResult{status:"failed"}` with the body surfaced.
6. **Sidecar** (Node vitest) `test_UAT_FC_REQ-46_sidecar_refuses_command_outside_allowlist` — POST `{command:"delete"}` → 400 with explicit allowed list, no spawn.
7. **Sidecar** `test_UAT_FC_REQ-46_sidecar_refuses_cwd_outside_first_contact` — XGD_CWD set to an outside path → POST returns 500 explaining cwd guard; no spawn.

(Spawning real `xgd` is exercised by smoke test, not part of CI UAT coverage — the sidecar tests use an injected spawn fn.)

## Out of scope

- No grant for `xgd ticket update`, `xgd ticket comment`, or any non-ticket `xgd` subcommand.
- No production deployment of the sidecar. The sidecar's only purpose is the developer's local machine.
- No edits to global Claude Code settings (`~/.claude/settings.json`). The earlier `.claude/settings.json` and `.claude/headless-settings.json` attempts have been removed.
- No wrapper CLI under `bin/`. The integration is purely "AI in the chat panel calls a tool".

## Acceptance

- With `DEV_TOOLS_ENABLED=true` and the sidecar running locally, the AI can call `xgd_ticket {command:"list"}` from the chat panel and receive structured output.
- With `DEV_TOOLS_ENABLED` unset, the tool is invisible to the AI and the sidecar is irrelevant.
- All seven UATs pass; quality gate passes; coverage threshold met.
- Free-coding lifecycle observed: commits tagged `[FREE-CODED]`, ticket fields.commits populated, status moved to `free_coded`, body preserved.

## Implementation order (so you can stop me at any step)

1. **Sidecar skeleton + its UATs** (no Workers change yet).
2. **Handler + registration + Workers UATs** (still no chat-flow change visible to users since gated off by default).
3. **Local smoke test** (turn DEV_TOOLS_ENABLED=true in `.dev.vars`, hit the chat, observe end-to-end).
4. **Commit + ticket lifecycle**.