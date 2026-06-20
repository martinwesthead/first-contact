---
uid: comment-9ba45f58
id: COMMENT-114
type: comment
title: Comment on request REQ-34
created_by: xgd
created_at: '2026-06-20T18:26:42.904782+00:00'
updated_at: '2026-06-20T18:47:58.075671+00:00'
completed_at: null
last_field_updated: body
status: null
fields:
  subject_uid: request-6c4fbbc3
  kind: chat_transcript
---

<!-- xgd-cli-session ts="2026-06-20T18:26:40Z" model="claude-opus-4-7" continued_from="new" -->
*Captured by CLI Claude — paraphrased reconstruction from session memory, not raw capture.*

<!-- xgd-chat role="user" ts="2026-06-20T18:26:40Z" -->
#### You
REQ-33 is already implemented - did it do the right thing?

1. The new site creation is sort of pasting new material on top of the example site - this leads to a confusing mess. Can we clear the previous content when we do an import so that I am just looking at what the AI created from the new site (no contamination)?
2. The safety protocol is broken and frustrating for testing. I don't think it is the correct UX, it doesn't work and it is slowing testing down. Can you remove it for now? We will need to return to the copyright issues later but we have more fundamental concerns to address first.

Please create tickets for these two

<!-- xgd-chat role="assistant" ts="2026-06-20T18:26:40Z" -->
#### Claude
Diagnosis for issue 1 (paste-on-top contamination): `transcribe_site` writes asset mirrors and a digest, then the AI calls `state_edit` tools against whatever's currently in the draft. With the 1stcontact starter as the default entry point, every convert is a destructive merge — some 1stcontact modules get mutated, some don't, theme tokens partially clobber. The result is structural contamination independent of the paraphrase issue REQ-33 already fixed.

Decision shape: `transcribe_site` clears the draft to a minimal empty scaffold (one empty home page, default theme tokens, no modules, `config.businessName` populated from source title) before any mechanical work begins. Clear is unconditional — every convert clears, even on an empty draft. The Reset button + git/D1 history is the recovery net. Lives in the action handler, not as a separate AI tool call, so it's atomic and the AI can't forget. New Stage 0 emits an SSE event for the TranscribeProgress card to surface.

<!-- xgd-turn id="68baf812-5ae5-42e5-9948-22df260822b1-user" -->

<!-- xgd-chat role="user" ts="2026-06-20T18:31:44.767Z" -->
#### You
Please free code this

<!-- xgd-turn id="68baf812-5ae5-42e5-9948-22df260822b1-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-20T18:47:57.068Z" -->
#### Claude
Now I have enough context. Let me implement.

Now I'll update `transcribe-site.ts` to add Stage 0 clearing.

Now update the chat-driver to apply the cleared scaffold to the local store before subsequent state edits.

Now update the TranscribeProgress card to include Stage 0.

Now update the how-to doc.

Now write the UAT tests for REQ-34.

Now write a test for the chat-driver applying the cleared scaffold to the store before subsequent state edits.

Now let me check if there's a vitest setup and run the new tests to verify.

All 6 new UATs pass. Now check that the existing tests still pass.

All 82 regression tests pass. Let me run the full test suite to be sure.

All 365 tests pass. Let me also run the TypeScript build to catch type errors.

All 365 tests pass. Let me also double-check the ticket body is still accurate to the implementation.

Done. Summary:

**REQ-34 — free-coded** at commit `c54359d` (version `0.0.13`), status `free_coded`.

**What changed**
- `packages/builder-ui/src/empty-scaffold.ts` (new): `buildEmptyScaffold({ businessName? })` constructs the canonical 1-page scaffold using `defaultThemeTokens`.
- `apps/control-app/src/operator/transcribe-site.ts` (already in HEAD via 58fce2b): Stage 0 emits `{tool: 'transcribe_site', stage: 0, status: 'cleared', businessName}` and the return payload carries `clearedSiteDefinition`.
- `apps/control-app/src/chat.ts`: server's `workingSite` is replaced with `clearedSiteDefinition` after the action returns so subsequent AI turns see the empty draft.
- `packages/builder-ui/src/chat-driver.ts`: FE driver applies `clearedSiteDefinition` before processing any state_edit calls, so the local store lands on the cleared scaffold and the AI's overlays land on top of it.
- `packages/builder-ui/src/components/transcribe-progress.ts`: 5-row stage list (Stage 0 "Clearing draft" added at the top); `applyTranscribeEvent` handles `{stage: 0, status: 'cleared'}`.
- `docs/llm-context/reproducing-a-website.md` + inlined mirror in `llm-context.ts`: how-to now tells the AI to treat the draft as empty after `transcribe_site`.

**Tests (all 365 passing)**
- 5 new UATs in `tests/test_UAT_FC_REQ-34_clear_draft_before_convert.test.ts` covering ACs 1–5, `buildEmptyScaffold` Untitled fallback, AC3 prior-modules-stripped.
- 1 new UAT in `tests/test_UAT_FC_REQ-34_chat_driver_applies_cleared_scaffold.test.ts` covering the FE chat-driver applying the cleared scaffold before state_edit calls.
- Updated `test_UAT_FC_REQ-28_transcribe_progress_card.test.ts` for the 5-row stage list.

The REQ-34 ticket body was extended with an "Implementation notes" section describing how the converged implementation maps onto the original IN/Decisions plan and how the work was split across the REQ-35 (58fce2b) and REQ-34 (c54359d) commits.

<!-- xgd-chat-end -->