---
uid: request-9d7c5aba
id: REQ-49
type: request
title: Enhance transcription pipeline with headless browser rendering and structured
  digest
created_by: xgd
created_at: '2026-06-21T00:29:25.050546+00:00'
updated_at: '2026-06-21T18:22:06.292442+00:00'
completed_at: null
last_field_updated: status
status: ready_to_implement
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
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