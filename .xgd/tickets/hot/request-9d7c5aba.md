---
uid: request-9d7c5aba
id: REQ-49
type: request
title: Enhance transcription pipeline with headless browser rendering and structured
  digest
created_by: xgd
created_at: '2026-06-21T00:29:25.050546+00:00'
updated_at: '2026-06-25T18:45:32.837778+00:00'
completed_at: null
last_field_updated: status
status: ready_to_reconcile
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
  commits:
  - 766930879e7526e642439295eed8ce1e4a8e96d8
  - c76c78627ecfd80712702a65f467723c38e0e3fd
  version: 0.0.29
---

Enhancement

**Description:** The current static fetch pipeline (Layer 1) is insufficient for faithful site transcription. It misses CSS background images, computed fonts, and layout structure — all of which are critical for accurate reconstruction. We need to add headless browser rendering (Layer 2) and raw source access (Layer 3) to produce a richer digest that the AI can reason from.

**Proposed Architecture:**

**Layer 1 — Static fetch (existing, keep)**

- Fast, cheap, no browser needed

- Captures: raw HTML, text content, `<img>` src attributes, `<link>` tags

- Good for: business name, headings, body copy, nav structure, explicit images

**Layer 2 — Headless browser (new, Playwright/Puppeteer)**

- Runs for all `transcribe_site` calls; optionally for `analyze_page` via `forceRendered`

- Captures via API:

- `page.screenshot()` — full page PNG at 1280px desktop width

- `getComputedStyle()` on key elements (hero, nav, h1–h3, body text, cards)

- CSS background-image URLs resolved from computed styles

- Loaded font faces via `document.fonts`

- Full asset inventory via network interception

- Element bounding boxes for key sections (layout structure)

- Produces structured files added to the digest:

- `screenshot.png`

- `computed-styles.json`

- `fonts.json`

- `colors.json`

- `assets.json` (all images/fonts resolved and mirrored)

- `layout.json` (bounding boxes for hero, nav, sections, cards)

**Layer 3 — Raw source access (new)**

- Fetches original CSS files, resolves `@font-face`, media queries

- Used for edge cases where computed styles are ambiguous

- Adds `dom.html` and raw CSS to the digest

**Trigger logic:**

- `transcribe_site` — always run Layer 2 (it's a heavyweight operation anyway)

- `analyze_page` — run Layer 2 only when `forceRendered: true` (existing flag)

- Layer 3 — on demand or when Layer 2 confidence is low

**Motivation:** Identified during transcription of `joyfulculinarycreations.com`. The hero image was a CSS background and was silently dropped. Fonts, spacing, color application, and layout were all unrecoverable from static fetch alone. The resulting output was not a usable approximation of the source site.

**Acceptance criteria:**

- Headless browser runs as part of `transcribe_site` pipeline

- Screenshot is captured and stored in digest

- Computed styles extracted for key elements

- CSS background images resolved and added to asset inventory

- Font families and embed URLs captured

- AI reads screenshot + structured digest before reconstruction

- `joyfulculinarycreations.com` transcription produces a recognisable result

---

(new ticket)


---

## Scope refinement (2026-06-21)

Audit of `xgd-working` shows Layer 2 substrate already exists (REQ-21/REQ-22):
- `renderedFetch` + `BrowserDriver` interface in `packages/extractor/src/rendered-fetch.ts`
- `makePuppeteerDriver` (cloudflare-puppeteer) in `apps/control-app/src/operator/browser-driver.ts`
- Per-viewport screenshots → R2 via `uploadScreenshots`
- Computed styles for body/h1/h2/h3/primary-bg merged into the digest
- Computed `background-image` URLs resolved + added to the asset inventory
- `analyze_page` already feeds the desktop screenshot to Haiku for vision commentary

The real gap behind the joyfulculinarycreations.com regression is that `transcribe_site` *consumes* whatever `analyze_page` cached — if the static-only escalation decision said "sufficient", the cached digest has no screenshot, no computed styles, and no background-image inventory, and the transcription proceeds blind.

### In scope (this ticket)

1. **Force rendered in `transcribe_site`** — when the cached `ReferenceDigest` has `fetchPath: "static"`, run the rendered path (re-using `renderedFetch` + existing driver/budget/upload helpers), merge computed signals, and persist the upgraded digest back to the cache before building the `TranscriptionDigest`.
2. **`@font-face` URL capture** — extend the in-page eval to read `document.fonts` (and inline `@font-face` rules in `document.styleSheets`) for font-file URLs. Surface as `kind: "font"` `AssetRecord` entries so the existing mirror pipeline picks them up.
3. **Layout bounding boxes** — extend the in-page eval to record bounding boxes for hero, nav, sections, and cards. Surface on `Signals.layout` as a new `boundingBoxes` sub-object.
4. **Expose `screenshotUrl` in `TranscriptionDigest`** — add a `screenshotUrl` field per `perPagePlan` entry (just `/assets/${screenshotKey}` — already-served path) so the chat AI reading `read_transcription_digest` can render the screenshot via Anthropic vision without guessing the URL convention.

### Deferred (follow-up ticket)

- **Layer 3 raw CSS source access.** Ticket itself flags as "on demand / when Layer 2 confidence is low" — once `@font-face` is captured via Layer 2 (`document.fonts`), the marginal value is low.

### Out of scope

- New LLM call inside `transcribe_site` — keep the stage runner deterministic. The chat AI already reads the screenshot via the digest (Anthropic vision), and `analyze_page` still runs the existing vision-commentary pass.

### Acceptance (UATs)

- `test_UAT_FC_REQ-49_transcribe_site_forces_rendered.test.ts` — given a cached digest with `fetchPath: "static"`, `transcribe_site` runs the rendered path, the upgraded digest is written back to cache, and the resulting `TranscriptionDigest` carries the desktop screenshot key.
- `test_UAT_FC_REQ-49_font_face_urls_captured.test.ts` — given a page with `document.fonts` entries, the resulting digest's `assetInventory` contains `kind: "font"` records.
- `test_UAT_FC_REQ-49_bounding_boxes_captured.test.ts` — given a page with hero/nav/section elements, the resulting digest's `signals.layout.boundingBoxes` exposes their rects.
- `test_UAT_FC_REQ-49_screenshot_url_in_digest.test.ts` — `perPagePlan[i].screenshotUrl === "/assets/" + perPagePlan[i].screenshotKey` whenever a screenshot exists.

Live `joyfulculinarycreations.com` reproduction is operator-driven (manual smoke), not a CI gate.