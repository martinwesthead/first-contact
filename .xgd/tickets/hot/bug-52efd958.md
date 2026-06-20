---
uid: bug-52efd958
id: BUG-10
type: bug
title: 'Convert flow: blank iframe + missing TranscribeProgress card after REQ-34/REQ-35'
created_by: xgd
created_at: '2026-06-20T19:23:27.055507+00:00'
updated_at: '2026-06-20T19:23:43.879441+00:00'
completed_at: null
last_field_updated: status
status: in_progress
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
---

## What's broken

After REQ-34 + REQ-35 shipped, two issues with the convert flow:

1. **No assets in the chat feed.** The TranscribeProgress chat-card (with the per-stage progress list and the assets-mirrored / failures-to-mirror sub-sections) is not appearing. The operator just sees a plain "transcribe_site ✓" summary fallback card instead.

2. **Blank iframe after conversion.** The preview iframe is empty even after the AI runs the full reconstruction sequence (transcribe_site → read_transcription_digest → set_theme_token → add_module × N). The AI is calling `get_site_definition` and reporting that modules exist (`header-1`, `hero-1`, `text-block-1`, `services-grid-1`, `text-block-2`) but no content is set on any of them, and the iframe is blank.

## Root cause (suspected)

### Issue 1 — TranscribeProgress card not registered

`packages/builder-ui/src/main.ts` calls `registerDigestReport()` but **never calls `registerTranscribeProgress()`**. So in the live SPA, the `transcribe_site_done` tool_result has no registered renderer and falls back to the plain summary card in `tool-result-renderers.ts`.

This is a pre-existing bug (since 0f6d904 introduced TranscribeProgress without wiring `registerTranscribeProgress` into `bootBuilder`). The Stage 0 row REQ-34 added is also invisible in the live app for the same reason — the card it lives on never renders.

### Issue 2 — Module IDs

The AI's how-to (`docs/llm-context/reproducing-a-website.md`) uses canonical example IDs like `hero-1`, `body-1`, `text-1` in its `set_module_content` examples — but it does NOT instruct the AI to pass an explicit `id` to `add_module`. Without an explicit `id`, `applyAddModule` generates a random suffix (`hero-x7q9pz`). The AI's subsequent `set_module_content({ instance_id: "hero-1", ... })` references the wrong ID → silent rejection → modules end up empty → iframe renders empty / mostly blank.

Before REQ-34, the AI's `set_module_content` calls landed on pre-existing modules from the 1stcontact starter (which had stable IDs like `hero`, `services`, `contact`). REQ-34's clear-to-empty-scaffold removes those, exposing the latent how-to gap.

NOTE: the user reports the AI now sees `header-1`, `hero-1`, etc. in the site definition — suggesting the AI may have started passing explicit IDs in its later attempts, but the iframe is still blank. So this hypothesis explains the FIRST failed convert but not necessarily the persistent blank-after-retry state. Needs dev-server verification.

## Verification plan (before code)

1. Boot `wrangler dev`. Run a real convert against an external URL.
2. Open the chat panel; capture each tool-call summary (`accepted` flag + error message for any rejections).
3. Capture the iframe's rendered HTML (via devtools "view source") to see whether modules are present-but-empty or genuinely absent.
4. Confirm whether registering `registerTranscribeProgress()` brings back the assets/failures display.

## Fix sketch

- **Issue 1 (mechanical):** add `registerTranscribeProgress()` to `bootBuilder` in `packages/builder-ui/src/main.ts`. Verify by booting dev and running a convert — TranscribeProgress card with Stage 0..4 + asset list should appear.
- **Issue 2 (instructional + structural):**
  - Update `reproducing-a-website.md` (+ the inlined `llm-context.ts` mirror) to instruct the AI to pass a deterministic `id` to `add_module` (`hero-1`, `text-block-1`, `services-grid-1`) and re-use that id for all subsequent `set_module_content` / `set_module_dial` / `set_module_variant` calls.
  - Consider also making `applyAddModule` return the assigned id in the tool_result payload so the AI can read it back rather than guess (defensive fix; survives operator-written prompts that don't follow the doc).

## Why bug not REQ extension

REQ-34's scope was "clear the draft before AI reconstruction". The clear itself works (tests prove it, the cleared scaffold is valid and is applied to both server workingSite and FE store). What's broken is the downstream AI flow that REQ-34 exposed (issue 2) and a pre-existing wiring gap that REQ-34 made more visible (issue 1). These are distinct from REQ-34's core contract.

## Acceptance criteria

1. After a convert, the chat shows a TranscribeProgress card with all 5 stages (0..4), the mirrored-assets count, and any failures-to-mirror rows.
2. After a convert against a real URL with mirrorable assets, the iframe shows a populated home page (theme tokens applied, modules with content from the digest, hero image visible).
3. Re-running convert against a different URL produces a similarly populated iframe (no contamination from the previous convert — REQ-34's behaviour preserved).
4. New UATs lock in the wiring of `registerTranscribeProgress` and the AI's add_module-with-explicit-id path through mocked Anthropic responses.