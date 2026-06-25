---
uid: bug-27ffa05a
id: BUG-15
type: bug
title: Preview screenshots don't render /assets/ images — breaks hero bg-image and
  service card photos
created_by: xgd
created_at: '2026-06-25T00:14:27.595296+00:00'
updated_at: '2026-06-25T00:23:21.516562+00:00'
completed_at: null
last_field_updated: story_points
status: free_coded
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
  commits:
  - d8b762d378520fee43dac98b245e03bdedf8296e
  version: 0.0.38
  story_points: 2
---

When preview_generated_page renders a screenshot, images stored at /assets/sites/anonymous/imports/... are not loading. The hero module uses variant bg-image with a valid assetRef (id: sites/anonymous/imports/17cfe3cb0fe61c5b.jpg, src: /assets/sites/anonymous/imports/17cfe3cb0fe61c5b.jpg) but the screenshot shows no background image — just the inverse surface colour. Service card images in services-grid are also missing. The preview digest flags 'no hero image inferred' even though the content field is correctly populated.

This makes the preview comparison tool useless for image-heavy sites because:
1. The hero bg-image variant is visually indistinguishable from bg-color in screenshots
2. The inspirationDelta comparison cannot detect image-related differences
3. Operators cannot verify photo placement visually before publishing

## Root cause

`preview-generated-page.ts` wraps the rendered HTML in a `data:text/html;...;base64,...` URL and hands that to Cloudflare's Browser Rendering binding. A data URL has no origin, so `/assets/<key>` references inside the HTML — emitted by the hero `bg-image` variant, by `services-grid` item images, and by header/footer logos — cannot be resolved by the headless browser and 404 silently. The screenshot has no images; the visual signals downstream (palette background, imagery counts) reflect the bare background colour, not the intended image.

The data-URL approach itself is correct (it sidesteps the wrangler-dev problem where the CF-cloud browser cannot reach the operator's localhost) — what's missing is that local R2-backed assets must be inlined into the HTML before it becomes the data URL.

## Fix

In `preview-generated-page.ts`, after `renderSiteToHtml` and before `htmlToDataUrl`, scan the rendered HTML for `/assets/<key>` references in both `src="..."` attributes and CSS `url(...)` expressions. For each unique key, fetch the bytes and content type from `ASSETS_BUCKET` (R2) and rewrite the reference to `data:<contentType>;base64,<bytes>`. Each key is fetched once and shared across all references. Missing keys preserve the original src (don't silently destroy information — the operator can still spot a broken link).

The inlined HTML is what the browser sees; the un-inlined HTML still drives `draftId` so content-addressing remains stable regardless of asset availability.

This only affects the preview path; production rendering (`tools/generate`) serves images via Cloudflare static assets normally.

## Steps to reproduce (pre-fix)

1. Run transcribe_site on any image-heavy site
2. Call preview_generated_page
3. Observe: hero background image absent, service card images absent despite valid assetRef objects in site definition

## Test plan

UATs in `tests/test_UAT_FC_BUG-15_*.test.ts`:

- AC1: hero `bg-image` variant with an `/assets/<key>` src — after rendering through `previewGeneratedPageHandler`, the URL passed to the browser driver decodes to HTML whose hero `<img>` `src="data:image/...;base64,..."` matches the bytes stored in R2.
- AC2: services-grid item images and header logo references are inlined identically.
- AC3: when an `/assets/<key>` reference points at an R2 key that does not exist, the original `src="/assets/<key>"` is preserved (graceful degradation; no crash, no silent dropping of the page).
- AC4: no `/assets/` references appear in `src` attributes that have valid R2 backings — i.e. the inliner is exhaustive across all such references in one render.