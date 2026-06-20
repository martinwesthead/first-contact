---
uid: comment-e50e3755
id: COMMENT-119
type: comment
title: Comment on request REQ-37
created_by: xgd
created_at: '2026-06-20T21:10:31.892309+00:00'
updated_at: '2026-06-20T21:44:27.398180+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  subject_uid: request-0f327580
  kind: chat_transcript
---

<!-- xgd-turn id="54c40de6-ceda-46cb-80be-26e451ff0c89-user" -->

<!-- xgd-chat role="user" ts="2026-06-20T21:10:12.686Z" -->
#### You
Please read this ticket and let me know if you have questions before implementing

<!-- xgd-turn id="54c40de6-ceda-46cb-80be-26e451ff0c89-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-20T21:11:22.381Z" -->
#### Claude
Let me find the relevant code to understand the current implementation.

I've read the ticket and the relevant code. Before implementing, I want to clarify a few things — the requirements span multiple stages and there are several reasonable interpretations.

**What's already in place (so I'm not duplicating):**

- `mirrorAssetBatchToR2` already emits per-asset `asset_mirrored` / `asset_failed` SSE events (`apps/control-app/src/operator/transcribe-site.ts:177-198`), and the final `summary.mirrorFailures` carries the count.
- The digest write is `await env.ASSETS_BUCKET.put(...)` — but there's no read-back verification.
- `read_transcription_digest` reads whatever is at `sites/{siteId}/transcription/digest.json` — no freshness or version check.

**Clarifying questions:**

1. **Asset mirror reporting** — the per-asset SSE events already fire. Is the gap that the **final tool return payload** only carries aggregate counts (`mirrored`, `mirrorFailures`) and not the per-URL failure list? You want the failed URLs + reasons in the returned `summary`?

2. **"Digest write should confirm"** — do you want a HEAD/GET read-back after `bucket.put` to verify the object is queryable before returning, or is the current awaited put + a tag/etag check sufficient? (R2 puts are atomic, so partial-bytes is unlikely; the practical risk is eventual consistency on read-back.)

3. **"Stale or partial digest" on read** — two interpretations:
   - (a) **Stale across converts** — the prior convert's digest still sits in R2 if a new convert is mid-flight or has crashed. Should `transcribe_site` *delete* the old digest at Stage 0 and `read_transcription_digest` return `not_ready` while none exists?
   - (b) **Versioning** — embed a `capturedAt` / generation id and have the caller pass an expected id to detect drift?
   - Or both?

4. **Module-building phase failure summary** — this is the one I most want to pin down. The "module-building phase" happens *after* `transcribe_site` returns, across many subsequent AI tool calls (`add_module`, `set_module_content`, `set_module_dial`, etc.). Three possible shapes:
   - (a) **Server-side accumulator** — the session tracks every failed tool call and exposes a `get_failed_actions` tool the AI must call before declaring done.
   - (b) **AI-called summary tool** — a new `report_module_failures` tool the AI is prompted to call at end of turn, listing what it knows failed.
   - (c) **Client-side display** — chat driver collects `action:failed` events and shows a "retry these" panel after the run.
   
   Which do you want? And what counts — every failed action handler call, or only module-mutation calls?

<!-- xgd-turn id="4abc97c0-7c7c-4b19-b989-f9d2b08ca4eb-user" -->

<!-- xgd-chat role="user" ts="2026-06-20T21:28:29.577Z" -->
#### You
**The summary for your dev team:**

1. Yes — failed URLs and reasons in the summary payload
2. Yes — read-back check before returning from transcribe_site
3. Option (a) — delete old digest at Stage 0, return `not_ready` if none exists
4. Option (c) — client-side failure panel, plus inject failures back into AI context for automatic retry

<!-- xgd-turn id="4abc97c0-7c7c-4b19-b989-f9d2b08ca4eb-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-20T21:44:26.382Z" -->
#### Claude
Got it. Let me first update the ticket with the decisions, then survey the chat-driver/SSE plumbing for the panel + retry injection (req 4 is the part I have least visibility into).

I'll preserve the existing ticket body and append the decisions.

Surveyed. The plan is clear:

**Server-side changes:**
- `transcribe-site.ts` — Stage 0 delete prior digest; add `assetFailures` to `summary`; post-put read-back verification with `capturedAt` sentinel.
- `read-transcription-digest.ts` — return `ok` with `kind: "transcription_digest_not_ready"` instead of generic failed.

**Client-side changes:**
- `store.ts` — add `pendingToolFailures` field with mutators.
- `chat-driver.ts` — accumulate failed tool calls per turn; before next POST, prepend a system message describing failures, then clear.
- `chat-panel.ts` — render dismissable banner above message list when pending failures exist.

Now let me look at one more existing UAT for stage flow context, then write the new UATs.

Now I have everything I need. Let me write the UAT tests for REQ-37.

Now the chat-driver failure accumulator + reinjection UAT.

Tests written. Let me confirm they fail (RED), then implement.

7 failures (RED) as expected. 4 incidental passes match the no-op cases. Now I implement.

Now the read handler.

The existing REQ-30 test asserted the old `digest_not_found` failure shape — update it to match the new `not_ready` contract.

Now let me run the server-side REQ-37 tests to confirm GREEN before moving on to the chat-driver work.

All server-side GREEN. Now the chat-driver / store work.

Now add the mutator methods on the store and chat-driver wiring.

Now wire the chat-driver: accumulate failures after each turn, and reinject as a system message on the next outbound turn.

I need to rewrite the chat-driver test to emit SSE frames the driver actually parses.

Now wire the chat-driver to record failures and reinject them.

Now reinject the system note before POST and accumulate failures after the turn finishes.

Now accumulate failures after each turn finishes, and add the formatter.

Let me run the chat-driver test to see if it passes.

Now the UI panel — render a dismissable banner above the message list when pending failures exist.

Now subscribe to pending failures and render the panel.

Let me add a small UI UAT for the panel rendering and dismiss behavior.

Run all the REQ-37 tests together to confirm they all pass.

All 12 REQ-37 UATs pass. Now let me confirm nothing regressed in the broader test suite.

Let me verify these failures are pre-existing (not from my changes) by checking the git baseline.

Let me run the previously-failing tests against the stashed baseline to see if they were pre-existing.

Let me quickly verify the pre-existing failures don't involve files I touched.

Pre-existing SSE-refactor failures (10 tests across multiple files) are unrelated to my changes — they fail because tests stub `jsonResponse` against the streaming driver. My REQ-37 UATs (12) all pass.

Let me run the FREE-CODING quality gates before committing.

Pre-existing typecheck/test issues are inherited from in-flight working tree modifications (SSE chat-driver refactor, chat-panel spinner work) — they exist with or without my REQ-37 changes. My 12 UATs all pass. Time to commit.

Now mark the ticket as `free_coded` with the commit SHA.

My commit is `e5cec1a`. Now update the ticket fields.

Ticket marked `free_coded`. Verifying state.

REQ-37 is shipped and free-coded. Summary:

**Changes (commit `e5cec1a` + version bump `a1ed699`):**

| Concern | Change |
|---|---|
| Per-URL asset mirror failures | `transcribe_site` payload `summary.assetFailures: Array<{url, reason}>` |
| Digest write confirmation | Post-put read-back; verifies `capturedAt` round-trips; `digest_write_unverified` on drift |
| Stale digest at read time | Stage 0 deletes prior digest; `read_transcription_digest` returns `ok` + `kind: "transcription_digest_not_ready"` instead of generic failure |
| Module-build failure summary | `BuilderStore.pendingToolFailures` accumulates rejected tool calls; chat-panel renders a dismissable banner; chat-driver prepends a synthetic system note on the next turn so the AI retries automatically |

**12 new UATs pass:**
- `test_UAT_FC_REQ-37_summary_includes_asset_failures.test.ts` (2)
- `test_UAT_FC_REQ-37_stage0_deletes_prior_digest.test.ts` (2)
- `test_UAT_FC_REQ-37_digest_write_readback_verified.test.ts` (3)
- `test_UAT_FC_REQ-37_read_digest_not_ready.test.ts` (2)
- `test_UAT_FC_REQ-37_chat_driver_failure_reinjection.test.ts` (2)
- `test_UAT_FC_REQ-37_failure_panel.test.ts` (1)

**Note:** 10 unrelated pre-existing test failures (REQ-13/REQ-30/REQ-34 chat-driver tests using `jsonResponse` stubs against the in-flight SSE refactor, plus REQ-32 spinner CSS) were present in the working tree before this session and are not affected by my changes.

<!-- xgd-chat-end -->