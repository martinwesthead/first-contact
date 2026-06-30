---
uid: story-bab9b773
id: STORY-71
type: story
title: Render the AI's own draft page into a Preview Digest so the assistant can see
  its own work
created_by: xgd
created_at: '2026-06-30T06:23:42.812233+00:00'
updated_at: '2026-06-30T06:23:42.812233+00:00'
completed_at: null
last_field_updated: created_at
status: unplanned
fields:
  intent_uid: bundle-93cd5926
  capability_uid: capability-9395ee51
  story_kind: feature
  story_points: 3
---

## Story

**As** the builder AI assistant (acting on behalf of the operator), **I want** to render the operator's current draft page and get back the same kind of visual + structural digest I already produce for external reference sites, **so that** I can see my own generated work — check it against an inspiration source, confirm a module change landed visually, or answer "what does this page look like right now?" — instead of designing blind and routing every visual question through the operator.

## Description

Adds `preview_generated_page`, a self-inspection sibling to `analyze_page`. Where `analyze_page` digests an **external** reference URL, `preview_generated_page` digests the operator's **own** draft page, closing the AI perception loop.

The tool renders the active draft page from the current site definition, captures three-viewport screenshots and computed-style signals via the same rendered pipeline `analyze_page` uses, and returns a **Preview Digest** — the Reference Digest shape plus a `previewSource` provenance block (account, draft, page, capture time). When the caller supplies a `compareToDigestId` that resolves to a previously analyzed reference digest, the tool additionally returns an `inspirationDelta`: a short multimodal narration of the concrete visual differences between the draft and the inspiration. The result renders in the builder chat as a dedicated preview card (screenshot strip on top, computed-signal panels below, and a "vs. inspiration" section when a delta is present).

**In scope:**
- New `preview_generated_page` operator tool (trial tier), exposed to the builder AI.
- A Preview Digest artifact = Reference Digest + `previewSource` provenance, with a content-addressed `draftId`.
- Screenshots persisted under a `previews/` namespace distinct from the `references/` namespace.
- The draft is rendered and captured self-contained (inline), with local `/assets/<key>` images inlined so they appear in the screenshot (BUG-15).
- A degraded path that still surfaces the draft's structural signals when visual capture is unavailable (no Browser Rendering binding) or the browser budget is exhausted.
- Optional multimodal `inspirationDelta` comparing the draft to a cached reference digest.
- A `<PreviewDigestReport>` chat card.

**Out of scope (explicitly deferred by the operator):** side-by-side / overlay visual diffs; an automatic correction loop; publish-gating on visual divergence; per-element pixel diffing; mobile/tablet delta commentary (desktop-only deltas in v1, though all three viewports are still screenshotted); caching of the Preview Digest (draft state changes every turn).

## Technical Context

- Reuses CAP-46 (Reference Digest Extraction) extraction + render-digest-markdown primitives and the REQ-22 rendered-fetch / screenshot-upload pipeline end-to-end. The Preview Digest extends the Reference Digest schema (adds `previewSource`); no parallel digest type or pipeline is introduced. Sibling of STORY-56 (`analyze_page`).
- Per CAP-44 (External Fetch Safety): the same browser-budget gate as `analyze_page` applies; budget exhaustion degrades gracefully rather than failing (consistent with BUG-17 raising the default budget).
- The preview is rendered self-contained and navigated to inline (a data-URL of the draft's own rendered HTML) rather than via a localhost/origin fetch, because Cloudflare's Browser Rendering binding runs in the CF cloud and cannot reach the operator's local origin during `wrangler dev`. `sourceUrl` is therefore a synthetic `preview://` identifier, not a fetchable URL.
- BUG-15: local `/assets/<key>` references (hero bg-image, services-grid item images, header/footer logos) must be inlined from asset storage before capture, otherwise they 404 silently inside the origin-less render. Missing assets preserve their original reference (graceful degradation). `draftId` is derived from the canonical (pre-inlining) draft render, so asset-byte availability does not perturb it.
- The request context gained a `requestOrigin` field threaded by the chat handler / operator router (implementation plumbing supporting absolute-URL construction; no operator-visible behavior of its own — noted here, not asserted as an AC).
- Divergence note for regression: the original intent (AC1 of REQ-51 body) described screenshots persisted to a `previews/{accountId}/...` R2 prefix via an uploaded HTML file; the shipped code keeps the `previews/` screenshot prefix but navigates via an inline data-URL instead of an uploaded HTML file (amendment 3dcf349). ACs below reflect the shipped (inline) behavior.

## Dependencies

None (plan item 2 of 3; no inter-item dependencies).

## Story Points

3
