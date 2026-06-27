---
uid: report-2609c4ee
id: REPORT-631
type: report
title: Claude batch_fix_assessment report
created_by: xgd
created_at: '2026-06-27T01:46:39.997612+00:00'
updated_at: '2026-06-27T01:46:39.997612+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: batch_fix_assessment
  subject_uid: report-a5713a64
  parent_report_uid: report-5fc6b886
  batch_index: '0'
---

Both batch failures are resolved. Here is my assessment.

## Batch 0 of 1 — Stabilization assessment

### Failure 1 — AC-486: `test_UAT_AC486_chat_endpoint_forwards_to_anthropic_and_extracts_text_and_tool_use_blocks`

**Diagnosis: stale test.** The AC-486 ticket body has **already been reconciled** to describe the shipped behavior — a multi-turn agentic tool loop (max 8 turns) that executes every `tool_use` block server-side, appends a structured `tool_result` to the message list, recomputes the system prompt from the post-edit working site, and returns `{text, toolCalls, systemActions, intentToken}` where each `toolCalls` entry carries its `result`. The test, however, still asserted the old single-turn "proxy and return raw `{name, input}` blocks" contract. Its mock `tool_use` block even lacked an `id`, so production correctly filtered it out (the `id` is required to link the `tool_result`), yielding the empty `toolCalls` the failure showed.

**Action taken: fixed the test** (action 2/3) to match the AC verification exactly — two upstream turns, server-side execution, `tool_result` linkage, state recomputation, and structured `result`. Added a second UAT for the AC's rejected-tool-call clause (`is_error: true`, `ok: false`, working site unchanged). The forwarding contract (headers, model, registry-derived tool surface, catalog-bearing system prompt, message filtering) is preserved as strong evidence. A broken implementation cannot pass: it must forward correctly, execute the tool, append a proper `tool_result`, recompute state, and surface the structured result.

### Failure 2 — AC-548: `test_UAT_AC548_sse_endpoint_streams_five_event_types..._closes_cleanly`

**Diagnosis: stale matrix (over-claim).** The AC required a recurring ~15s keep-alive heartbeat. Production has **never** implemented one — `apps/control-app/src/operator/events.ts` (the sole commit, `483b0b55`) has no `setInterval`/`ping`/`keepalive`. The SSE channel works as intended (initial `: connected` frame, five event types, clean teardown on abort). The test's heartbeat assertion was also unobservable by construction — it read a 300ms window for a 15s-cadence frame.

**Action taken: amended AC-548** (action 5 — amend, not full deprecate, since the AC still covers valid shipped behavior) to drop the heartbeat requirement, with a note (`COMMENT-206`) documenting the deviation and deferring the heartbeat to a separate request. Updated the UAT to remove the unobservable heartbeat assertion while retaining the five-event-types, connected-frame, clean-close, and 400-on-missing-session checks. I chose amend-over-fix-code deliberately: in reconcile/stabilization mode code is the source of intent, a heartbeat is a feature addition (not the corner-case bug class that warrants action 6), and adding a per-connection `setInterval` would risk leaking timers across the sibling SSE tests that open connections without aborting.

### Verification
```
✓ test_UAT_AC486_chat_endpoint_proxies_anthropic.test.ts (2 tests)
✓ test_reconciliation_operator_dispatch_namespace.test.ts (9 tests, incl. AC548)
  11 passed (0 failed) — full sibling suite green, no blast radius
```

The `xgd quality run` wrapper reports an **infrastructure error** (`cannot import name 'Confidence'/'CoverageResult' from 'sdk'` — the JS/vitest quality plugin fails to load), which prevents it from executing any JS tests. This is a pre-existing tooling/packaging issue unrelated to and untouched by this batch (my edits are TypeScript test files + a matrix ticket; they cannot affect a Python plugin import), and the harness itself classifies it as not Claude-fixable. The fixes themselves are verified via direct `vitest` execution above.

Files changed (left uncommitted for the outer reconcile orchestration to handle):
- `tests/test_UAT_AC486_chat_endpoint_proxies_anthropic.test.ts`
- `tests/test_reconciliation_operator_dispatch_namespace.test.ts`
- AC-548 ticket body/title + note (auto-committed by the ticketing API)
