---
uid: bug-c9f8fb69
id: BUG-13
type: bug
title: Transcription misses CSS background images
created_by: xgd
created_at: '2026-06-21T00:17:24.747350+00:00'
updated_at: '2026-06-21T18:23:34.323350+00:00'
completed_at: null
last_field_updated: body
status: free_coded
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
  commits:
  - 9ebaf2cbba6060d44586fd89a1d5cc017dc4a823
  - 5755490c4f986dd1b53452350bb5b07647470c80
  version: 0.0.28
---

**Type:** Bug

**Description:** When transcribing a site, images used as CSS `background-image` on container elements are not captured. Only `<img>` tags with `src` attributes are picked up by the static fetcher. This is common for hero sections where text overlays a full-bleed background image.

**Observed:** Hero image on `joyfulculinarycreations.com` was not captured during transcription. The heading/subhead text was correctly extracted but the image was silently dropped.

**Proposed fix (in order of preference):**

1. **CSS parsing (lighter):** After static fetch, parse the raw CSS and resolve any `background-image: url(...)` references into the asset inventory.

2. **Browser rendering (heavier):** Use the rendered page path and extract computed background-image URLs via `getComputedStyle`. Likely needed anyway for other transcription accuracy issues.

**Notes:** Given the broader accuracy challenges seen in this project, the browser rendering path may be the right long-term investment regardless. CSS parsing is the cheaper first step if we want a quick win.



---

**Implementation (commits 9ebaf2c + 5755490, v0.0.28)**

Took the "CSS parsing (lighter)" path. Investigation revealed the existing parser already covered inline `style=""` and `<style>` blocks — the actual gap was **external stylesheets** (`<link rel="stylesheet">`). joyfulculinarycreations loads 39 external CSS files with no `<style>`-block backgrounds, so its hero was invisible to the static path.

- New module `packages/extractor/src/external-stylesheets.ts`:
  - `extractExternalStylesheetAssets(html, baseUrl, fetcher)` — fetches each `<link rel=stylesheet>` href concurrently, walks the CSS through the existing `walkCssRules` (which already recurses into `@media`), extracts `background-image` / `background` url() values, returns `AssetRecord[]` with `kind="background"`.
  - `mergeStylesheetAssets(signals, extra)` — folds discovered assets into `signals.assetInventory` via dedup-by-URL (existing entries get `references++`); updates `imagery.backgroundCount`.
  - url() values resolve relative to the **stylesheet** URL, per CSS spec.
  - `data:` URLs filtered out; `@import` chains not followed (documented limitation).
- Wired into `apps/control-app/src/operator/analyze-page.ts` between `extractSignals` and the rendered-pass merge — the rendered merge and the digest both see the enriched static inventory.
- `makeStylesheetFetcher` wraps `safeFetch` (so robots.txt / rate limit / safety allowlist all apply).
- 8 ACs covered by `tests/test_UAT_FC_BUG-13_external_stylesheet_backgrounds.test.ts`. Full suite: 635/635 passing. No new typecheck errors in touched files.