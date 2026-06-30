---
uid: report-cec5f7c4
id: REPORT-891
type: report
title: Claude fix_reconciliation_review report
created_by: xgd
created_at: '2026-06-30T05:44:49.205464+00:00'
updated_at: '2026-06-30T05:44:49.205464+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: fix_reconciliation_review
  subject_uid: bundle-44f53d53
---

All 16 test files are modified in the working tree, the AC-585 title is corrected, and no implementation code was touched. I'll leave the changes uncommitted — the reconcile workflow runs the full suite and handles commits after this fix.

## Summary

The reconciliation review FAILED on **Step 5b evidence sufficiency**, not behavior: `apps/control-app/src/chat.ts` was correctly refactored to the **server-resident** chat contract (client sends `{sessionId, userMessage, siteDefinition, frameworkCatalog}`; the server appends the user message, primes Anthropic from the stored session tail, and streams SSE), but a swath of committed UATs still encoded the superseded `history`/browser-transcript contract and failed (18 failed | 1035 passed). I migrated every stale UAT to the new contract **without changing the implementation**, preserving each test's original intent.

**Stories created / deleted:** none — this was test-debt, not a coverage gap or ungrounded story.

**Stories modified (matrix):**
- **AC-585** (`acceptance_criterion-287af37d`) — fixed the cosmetically stale title (`"…persisted to browser storage…"` → `"Chat-turn history is server-resident and restored from the session API tail on builder re-mount"`). Body was already correct.

**Code changes (test files only — 16):**
- **Server-handler UATs** (seed a D1 session via `seedChatSession`, switch body to `{sessionId,userMessage,…}`, add `SITES_DB`, drain the SSE stream): AC-553, AC-554, AC-580, AC-734, AC-631.
- **AC-486** — seed the prior turn as session rows; primed-messages assertion now expects the stored tail (user/assistant only, system filtered) **plus** the appended user message.
- **AC-487** — rewritten to the new error taxonomy: missing key → synchronous **500**; upstream throw / non-2xx → in-stream **`error` SSE event on a 200 stream** (the old 502 path no longer exists).
- **AC-633 / AC-634** — converted the scripted upstream from plain-JSON to streaming SSE (`makeAnthropicStreamingFetch`), seeded a session, and switched `response.json()` → `consumeChatSSE`.
- **Cross-story reconciliation files** — AC-717 (`ai_editing_surface`), AC-551 (`operator_dispatch_namespace`), AC-605/606 (`analyze_page_action`, using the in-memory `makeStubChatDb` since those tests stub `globalThis.fetch`, and SSE-encoding the chat turns).
- **UI-driver UATs**: AC-730 (added `chatSessionId`), AC-735 (reinjection now asserted on the server-side `POST /api/chats/:id/messages`, not an in-band `history` field), AC-585 (full server-resident rewrite: boot → run turns → server persists → re-mount with empty storage proves restore from the API tail).
- **REQ-50** (`test_UAT_FC_REQ-50_scope_rename_complete`) — added `--exclude=test_UAT_AC819_*` so the grep no longer self-matches the `@1stcontact/` literal that the AC-819 rename test legitimately carries as test data.

**Verification performed** (without running the suite, per instructions): the REQ-50 grep now returns empty; all 16 changed files transform cleanly through esbuild (vitest's collection step); confirmed `chat_messages.role` has no CHECK constraint (so seeding `system` rows is valid) and that the transcribe harness only overrides `globalThis.fetch` inside `invokeTranscribe` (so Miniflare D1 isn't affected).

**Confidence:** High that the re-run review will PASS. The 16 files map exactly to the review's enumerated 18 failing cases; each migration tracks a passing exemplar already in the suite (AC-811/812/815/816/817); the implementation is unchanged and was already certified correct. Residual risk is concentrated in the two full rewrites (AC-585 boot/restore timing, AC-735 reinjection routing), which I aligned to the proven `bootBuilder`/`ChatsApi` patterns and drained all deferred server-side appends to avoid Miniflare teardown races.
