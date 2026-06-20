---
uid: comment-6b9c4ccd
id: COMMENT-127
type: comment
title: Comment on bug BUG-10
created_by: xgd
created_at: '2026-06-20T21:18:11.621144+00:00'
updated_at: '2026-06-20T21:19:23.333251+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  subject_uid: bug-52efd958
  kind: chat_transcript
---

<!-- xgd-turn id="6ee46af9-c68c-4717-908c-d4df7317e26b-user" -->

<!-- xgd-chat role="user" ts="2026-06-20T21:17:51.988Z" -->
#### You
Please review the status of this bug by looking at the code. It says it is in progress which doesn't make any sense that is a bogus state for a free coded ticket.

<!-- xgd-turn id="6ee46af9-c68c-4717-908c-d4df7317e26b-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-20T21:19:22.325Z" -->
#### Claude
The ticket has a commit recorded (`65e79b603f5daaee6f596a1c35cf1e40873ee877`) and `fields.commits` populated, but status is still `in_progress`. Per the free-coding lifecycle, once the commit lands and `fields.commits` is set, status should be `free_coded` — `in_progress` is only valid while actively coding. Let me check the commit and verify the code state matches the bug's acceptance criteria.

The commit message explicitly states "BUG-10 issue 2 (blank iframe after convert) is unresolved" — only issue 1 was addressed. Let me verify the code state matches that.

## BUG-10 status review

**Status mismatch confirmed.** The ticket is at `status=in_progress` with a commit (`65e79b6`) already in `fields.commits`. Per FREE-CODING.md, once the commit lands and `fields.commits` is populated, the status should be `free_coded` — `in_progress` is only valid while actively writing code. Nothing is being actively coded right now.

### What the recorded commit actually does

The commit message itself states: *"BUG-10 issue 2 (blank iframe after convert) is unresolved … This commit addresses issue 1 only."*

### Code verification against the ticket's two acceptance issues

| Issue | Status | Evidence |
|---|---|---|
| **1. TranscribeProgress card not registered** | ✅ FIXED | `packages/builder-ui/src/main.ts:8,83` imports and calls `registerTranscribeProgress()` next to `registerDigestReport()`. UAT `tests/test_UAT_FC_BUG-10_bootbuilder_registers_transcribe_progress.test.ts` locks it in. |
| **2a. AI how-to instructs explicit module IDs** | ❌ NOT FIXED | `docs/llm-context/reproducing-a-website.md:20` says "call `add_module` to insert each one" — no instruction to pass an explicit `id`. Examples use `instance_id: "hero-1"` in `set_module_content` but never tell the AI to pass `id: 'hero-1'` to `add_module`. |
| **2b. `applyAddModule` returns assigned id** | ❌ NOT FIXED | `packages/builder-ui/src/tools.ts:245-248` still generates random suffix when no id passed, and the tool_result (line 281) returns only the validator result — no `id` field surfaced. |

Acceptance criteria 2, 3, and the portion of 4 about "add_module-with-explicit-id path" remain unmet.

### Recommendation

Two clean paths — your call:

**Option A — Park at `free_coded` for the partial fix, continue the work in the same ticket later.** This matches the FREE-CODING.md "Iteration after operator validation" pattern: status sits at `free_coded`, body is refreshed to say "issue 1 shipped; issue 2 pending dev-server verification + AI-doc + tool-return-id fix". A future session adds the second commit to `fields.commits` and keeps the status at `free_coded`.

**Option B — Stay `in_progress` only if you intend to finish issue 2 in this session.** Otherwise B is wrong — it leaves a landed commit in an active state with nobody actively working.

Either way, the body should be updated to reflect that issue 1 is shipped (it currently still reads as a pure scoping document, no "what landed" section). Want me to (a) move to `free_coded` and refresh the body, or (b) push forward on issue 2 now?

<!-- xgd-chat-end -->