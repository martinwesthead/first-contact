---
uid: comment-9fd701a1
id: COMMENT-296
type: comment
title: Claude response for reconciliation_uat_generation report
created_by: xgd
created_at: '2026-06-30T01:46:43.127359+00:00'
updated_at: '2026-06-30T01:46:43.127359+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  subject_uid: report-1903c56a
  kind: note
---

## Summary

Story **story-b3866352** ("Convert an existing website into an editable draft") has 12 acceptance criteria. Eleven already have committed `test_UAT_AC{N}_*` UATs from prior `reconciliation_uat_generation` runs. The one gap was **AC-791** — the REQ-49 "force-rendered digest upgrade", a *new* AC added in this BUNDLE-8 reconcile and only covered by the soon-to-be-superseded FC-named `test_UAT_FC_REQ-49_*` test. I created the AC-named UAT for it.

The AC-791 UAT exercises both branches the criterion specifies, through the real `transcribeSiteHandler` entry point (only the browser driver / global fetch are thin-mocked):
- **Upgrade path** (browser available): static-only cached digest → rendered-fetch driver invoked → digest re-read from `FETCH_CACHE_KV` now has `fetchPath: "rendered"` + desktop screenshot key → persisted `perPagePlan` exposes that screenshot → `render_upgrade_completed` notify.
- **Best-effort skip** (no browser binding): convert still succeeds, cached digest stays `static`, `render_upgrade_skipped` (`browser_binding_missing`) emitted, page still in the plan with no screenshot.

```
UATs generated for story story-b3866352 (plan item 5 of 5)

Story: story-b3866352
Test file(s) created:
  - tests/test_UAT_AC791_static_digest_force_rendered_upgrade.test.ts

Tests written: 1
Tests passed: 1
Tests failed: 0

test_files_created:
  - "tests/test_UAT_AC791_static_digest_force_rendered_upgrade.test.ts"
```

### ⚠️ Pre-existing failures in this story's UAT set (NOT created/modified by me — flag for fix-it loop)

Two committed E2E UATs for this story fail **in isolation**, independent of my additive change:

- `test_UAT_AC633_single_page_conversion_draft.test.ts` — `test_UAT_AC633_single_page_conversion_yields_styled_draft`
- `test_UAT_AC634_multi_page_conversion_draft.test.ts` — `test_UAT_AC634_multi_page_conversion_yields_multi_page_draft`

Both fail with `SyntaxError: Unexpected token 'e', "event: don"... is not valid JSON`.

**Root cause** — a test-vs-code contract drift, not a defect in the convert orchestration: these UATs call `handleChatRequest(...)` then `await response.json()` to read `{ toolCalls }`. The chat endpoint was changed by REQ-36 (`e8c6c9a2 …end-to-end streaming`) to return a `text/event-stream` SSE response (`apps/control-app/src/chat.ts:438-441`), emitting `toolCalls` *inside* the stream. The UATs were generated before that change and still assume the JSON body.

Per the AC bodies (which describe the reconstructed-draft *outcome*, not the transport), the **tests** are the wrong side here and need to consume the SSE stream rather than `response.json()`. I did not touch them — modifying existing tests and runtime code is outside this prompt's scope. The downstream fix-it loop should repair these two E2E UATs to parse the SSE response.
