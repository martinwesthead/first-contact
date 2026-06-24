---
uid: comment-0361d11c
id: COMMENT-145
type: comment
title: Comment on request REQ-51
created_by: xgd
created_at: '2026-06-24T20:30:10.219512+00:00'
updated_at: '2026-06-24T20:52:26.802052+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  subject_uid: request-67e3e495
  kind: chat_transcript
---

<!-- xgd-turn id="60b65695-3185-4f61-92a0-372cc9ae9740-user" -->

<!-- xgd-chat role="user" ts="2026-06-24T20:29:45.344Z" -->
#### You
Please free code this ticket

<!-- xgd-turn id="60b65695-3185-4f61-92a0-372cc9ae9740-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-24T20:52:25.788Z" -->
#### Claude
I've read the ticket. Now let me explore the codebase to understand the existing infrastructure I'll be building on top of — specifically the `analyze_page` tool, the `extractor` package, the chat-card components, and the builder preview infra.

Let me explore the existing `analyze_page` implementation and the builder preview infrastructure.

Let me explore the preview infrastructure and how the AI accesses the draft state.

Now let me look at the chat handler to understand how draft state/session context is delivered, and at recent UAT tests to understand the test conventions.

Let me look at one of the recent UAT tests to follow the test convention, plus understand the existing analyze_page tests:

Now let me look at more of the existing analyze-page tests to understand the conventions and the existing in-page preview-URL surface:

Let me also look at the merge step + existing schema-extending pattern (for budget gates and similar):

Now let me check how the AI can call this. The key insight: the AI doesn't have a separate "browser preview". It calls a tool. The control-app worker needs to render the current `siteDefinition` to HTML (via `@gendev/framework/render`) and then pass that to the browser renderer somehow.

Let me check the framework render module to see how to render a page to HTML server-side:

Let me check for existing preview URL routes:

Let me check all callers of uploadScreenshots:

Now I have enough context. Let me start implementing.

**Step 1: Extend the schema with PreviewDigest**

Now extend the index re-exports:

**Step 2a: Generalize uploadScreenshots to accept a custom path prefix**

**Step 2b: Create `renderPreviewDigest` in extractor**

Now add the exports to the extractor index:

**Step 3: Implement the operator handler** `preview-generated-page.ts`

First let me check the site-schema package and how the framework render package is imported:

Let me add `@gendev/framework` as a dep to control-app and also check how the chat context's request URL is available:

Now let me extend ActionContext with `requestOrigin`:

Now propagate `requestOrigin` from the chat handler and the operator router:

Now add the `requestOriginOf` helper. Let me find a good spot:

Now let me update the operator router:

Now check other call-sites for ActionContext:

Each existing helper builds an `ActionContext` literal. Since I added `requestOrigin: string | null` as a required field, those will fail typecheck. Let me update them to include it:

Good. Now let me write the actual handler:

Now let me write the handler:

Let me check the schema constant and fix the budget-exhausted payload to use SCHEMA_VERSION:

Now also fix `referenceCacheKey` to use SCHEMA_VERSION:

**Step 4: Register the tool in the registry**

Now register the action spec. Let me insert it after `analyze_page`:

**Step 5: Build PreviewDigestReport chat-card**

Add it to the index:

Also register the renderer at boot. Let me check `main.ts`:

**Step 6: Write UAT tests for REQ-51**

Let me first run the existing tests to ensure I haven't broken anything:

Let me check if these errors are pre-existing:

The pre-existing tsc errors are not mine. Let me restore my changes:

Now let me run vitest to see how things stand:

Good, existing tests still pass. Now let me write the UAT tests for REQ-51. Let me first sample a starter site (need one for the renderer to have something to work with):

Now let me write the test helpers and UATs. I'll create one comprehensive test file:

Now write the actual UAT tests:

Now let me write a chat-card UAT covering AC6:

Now let me also write the registry-coverage UAT (AC7/8 — that the tool is registered + the schema validates):

Now run the test suite for REQ-51 to see if it all works:

The test forgot to re-install the driver between invocations. Let me fix:

Similar fix for the AC2/AC4 combined test:

All 14 REQ-51 tests pass. Now let me also verify I haven't broken any other tests in the suite:

All 698 tests pass. Let me now build the bundle/lint to verify build doesn't break:

Builder bundle compiles successfully.

Now bump the version, commit, and free-code the ticket:

Let me commit the changes first:

Good, deps are clean (workspace links). Now commit:

Now let me try the gate command. I need a version — let me check the current package version:

Excellent — the ticket is now `free_coded`. Now let me set `story_points` per the ticket spec:

Now let me verify the ticket body is current and complete. Per the protocol, I need to refresh the body so it reflects what was actually shipped:

Let me append a "What shipped" section to the ticket so reconcile sees implementation choices that went beyond the scope spec:

Ticket status is `free_coded` with the commit SHA, version, and story_points recorded.

REQ-51 is free-coded and ready for the operator to promote to reconcile.

**What shipped:**
- **Tool**: `preview_generated_page` registered as a `trial`-tier system action. Renders the AI's draft page server-side via `@gendev/framework`'s `renderSiteToHtml`, uploads HTML to `previews/{accountId}/{draftId}/{pageId}/page.html` in R2, drives Browser Rendering to capture mobile/tablet/desktop screenshots + computed styles, optionally runs a multimodal Haiku comparison against a cached `ReferenceDigest` to produce `inspirationDelta`.
- **Schema**: `PreviewDigest = ReferenceDigest + previewSource{ accountId, draftId, pageId, capturedAt }` in `packages/extractor/src/schema.ts`. `draftId` is content-addressed (sha256 of rendered HTML).
- **Plumbing**: `ActionContext.requestOrigin` added; `uploadScreenshots()` extended to accept `{ pathPrefix }` so the `previews/` family reuses the existing helper.
- **Chat-card**: `<PreviewDigestReport>` renders a screenshot strip, optional "vs. inspiration" section, and per-section markdown body — auto-registered at boot.
- **Tests**: 14 UATs in 3 files cover ACs 1–8; full suite 698/698 green.

**Ticket**: `REQ-51` at `status=free_coded`, `commits=[9947c69]`, `version=0.0.37`, `story_points=5`. Ready for you to promote to `ready_to_reconcile` when convenient.

<!-- xgd-chat-end -->