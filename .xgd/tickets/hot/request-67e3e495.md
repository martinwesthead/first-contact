---
uid: request-67e3e495
id: REQ-51
type: request
title: 'AI closed-loop preview: render generated draft pages so the AI can see its
  own work'
created_by: xgd
created_at: '2026-06-24T20:27:13.141203+00:00'
updated_at: '2026-06-24T20:27:13.141203+00:00'
completed_at: null
last_field_updated: created_at
status: draft
fields:
  priority: high
  story_points: 5
  auto_merge_back: true
  needs_review: false
---

## Problem

The AI generates HTML/CSS for the customer's site via the builder tool surface ([[REQ-8]] / [[REQ-14]] / [[REQ-30]] / the module set [[REQ-39]]…[[REQ-44]]) but cannot **see** the rendered result. [[REQ-21]] and [[REQ-22]] give it full visual fidelity on competitor pages — screenshots, computed CSS, layout signals — and then it ships its own output into the void.

Any reasoning of the form:
- "Does my generated hero match the inspiration?"
- "Is the alignment off?"
- "Did the theme tokens land the way I expected?"
- "Are the modules I picked actually rendering the layout density the brief asked for?"

is impossible. The AI designs blind, then routes verification through the human operator ("does this look right to you?") even when it could answer itself.

This is the missing closed loop. Without it the reconstruction quality from [[REQ-28]] (Layer B transcription) and [[REQ-30]] (convert flow rework) is unverifiable by the AI itself — the very capability that makes the convert demo land for an operator (the screenshot strip from [[REQ-22]]) is one-directional today.

## Origin

Surfaced in chat on 2026-06-24 while discussing [[REQ-22]]'s render-by-default amendment:

> "The render has to be applicable to the page the AI creates so it can see that too."
> — operator, 2026-06-24

Agreed in the same exchange; this REQ is the result. The companion change is the [[REQ-22]] Amendment 2026-06-24 (render-by-default for external pages).

## Scope

Add `preview_generated_page` — a sibling to `analyze_page` ([[REQ-21]] / [[REQ-22]]) that runs the SAME `renderedFetch` + `mergeComputedSignals` + screenshot-upload pipeline against the builder's current draft preview URL, returning the same digest shape the AI already knows how to reason over.

### Tool surface

```
preview_generated_page({
  pageId?: string,              // defaults to active page in draft
  compareToDigestId?: string,   // cached ReferenceDigest URL to diff against
}) → {
  kind: 'preview_digest',
  digest: PreviewDigest,        // ReferenceDigest shape + previewSource field
  digestMarkdown: string,
  inspirationDelta?: string,    // present iff compareToDigestId resolves
}
```

- Resolves the draft preview URL from the existing in-browser preview infra ([[REQ-8]] / [[REQ-12]] / [[REQ-31]]).
- Reuses the [[REQ-22]] pipeline end-to-end. No new Browser Rendering wiring.
- Multimodal commentary: same Haiku 4.5 image-input pattern. When `compareToDigestId` resolves, the prompt feeds **two** images (preview + reference) and asks for explicit deltas in `inspirationDelta` ("hero is left-aligned in your generated page, centered in inspiration — adjust X by Y").

## IN

### `packages/extractor` additions

- `renderPreviewDigest(env, { previewUrl, pageId })` — wraps `renderedFetch` + `mergeComputedSignals` against a builder-internal preview URL. Returns the same `ReferenceDigest` shape with `fetchPath: 'rendered'`. Screenshots uploaded to `previews/{accountId}/{draftId}/{pageId}/{viewport}.png` (distinct prefix from `references/` so chat-deletion sweeps can scope correctly).
- `PreviewDigest` type — extends `ReferenceDigest` with `previewSource: { accountId, draftId, pageId, capturedAt }`.

### `apps/control-app` wiring

- Register `preview_generated_page` in the operator action registry. Same budget gate from [[REQ-20]] as `analyze_page`.
- Tool description in the AI surface emphasises the self-inspection use case: "Render the current draft page and return what it looks like — use this to check your own work against an inspiration digest, to verify a module change landed visually, or to answer 'what does this page look like right now?'"
- Resolves the preview URL via the same in-browser preview surface the operator already sees in the builder.

### Builder UI

- `<PreviewDigestReport>` chat-card variant — mirror of `<DigestReport>` from [[REQ-22]]. Renders the AI's own page as the AI sees it; screenshot strip at the top, computed-signal panels below.
- When `inspirationDelta` is present, the card includes a "vs. inspiration" section quoting the delta paragraph.

### Multimodal commentary upgrade

When `compareToDigestId` resolves to a cached `ReferenceDigest`, the Haiku 4.5 call gets BOTH the desktop preview screenshot AND the desktop reference screenshot (when available), with a prompt that explicitly asks the AI to enumerate visual deltas — alignment, density, hero treatment, typography weight, palette warmth. Result lands in `inspirationDelta` as 2–4 sentences.

## OUT (explicitly deferred)

- Side-by-side visual diff rendering (overlay, alpha-blend) — text deltas are sufficient v1.
- Automatic correction loop ("if delta > threshold, fix and re-render") — operator initiates fixes; no auto-loop.
- Publish gating on visual divergence — operator judgment, not a hard gate.
- Per-element pixel diffing — semantic deltas only.
- Mobile / tablet delta commentary — desktop only in v1 (mobile + tablet screenshots are still captured and returned for the operator's view).
- Caching of `PreviewDigest` — draft state changes on every operator turn; caching would routinely return stale.

## Dependencies

- [[REQ-22]] — rendered fetch pipeline, screenshot upload, multimodal commentary. The amendment to render-by-default lands before this REQ ships so `compareToDigestId` reliably points at a rendered reference.
- [[REQ-20]] — budget gate, ASSETS_BUCKET, safety contract.
- [[REQ-8]] / [[REQ-12]] / [[REQ-31]] — builder draft state and preview URL surface.
- [[REQ-21]] — `ReferenceDigest` schema (extended here, not replaced).

## Acceptance criteria

1. `preview_generated_page` with no `pageId` returns a `PreviewDigest` for the active page with all three viewport screenshots populated (mobile / tablet / desktop), each persisted to the `previews/{accountId}/...` prefix.
2. The returned digest's `previewSource` carries the correct `accountId`, `draftId`, `pageId`, and ISO `capturedAt`.
3. With `compareToDigestId` pointing at a cached `ReferenceDigest` (rendered), the response includes a non-empty `inspirationDelta` string. The string contains at least one explicit comparison phrase (`aligned`, `centered`, `denser`, `lighter`, `warmer`, etc.) — verified by pattern matching, not just length.
4. With `compareToDigestId` pointing at an unknown/unresolvable digest ID, the tool returns the preview digest with `inspirationDelta: undefined` and a `whatsMissing` entry — no error.
5. Budget-exhaustion behaves identically to `analyze_page`: the call succeeds with no screenshots and a `whatsMissing` entry citing the exhausted budget.
6. Builder `<PreviewDigestReport>` chat-card renders the screenshot strip at the top of the card body and, when `inspirationDelta` is set, a "vs. inspiration" section showing the delta paragraph.
7. UAT: operator types "show me what you made" (or equivalent) → AI calls `preview_generated_page` with `compareToDigestId` set to the most recent reference digest in chat context → ChatCard renders with screenshots, computed-signal panels, and a delta paragraph. Total wall-clock under 30 seconds (parity with `analyze_page` on the same content).
8. UAT: with no reference digest in chat context, the same operator prompt produces a `PreviewDigest` chat-card with screenshots and signal panels but no "vs. inspiration" section — the AI's chat reply notes that no reference is loaded.

## Story points

5. Tool registration + `renderPreviewDigest` wrapper + `<PreviewDigestReport>` chat-card + multimodal two-image delta prompt + preview-URL resolver against the builder's existing preview infra. Smaller than [[REQ-22]] because the rendering pipeline, signal extraction, and screenshot upload are reused unchanged.
