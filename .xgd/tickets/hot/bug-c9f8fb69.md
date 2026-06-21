---
uid: bug-c9f8fb69
id: BUG-13
type: bug
title: Transcription misses CSS background images
created_by: xgd
created_at: '2026-06-21T00:17:24.747350+00:00'
updated_at: '2026-06-21T18:13:16.650949+00:00'
completed_at: null
last_field_updated: title
status: draft
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
---

**Type:** Bug

**Description:** When transcribing a site, images used as CSS `background-image` on container elements are not captured. Only `<img>` tags with `src` attributes are picked up by the static fetcher. This is common for hero sections where text overlays a full-bleed background image.

**Observed:** Hero image on `joyfulculinarycreations.com` was not captured during transcription. The heading/subhead text was correctly extracted but the image was silently dropped.

**Proposed fix (in order of preference):**

1. **CSS parsing (lighter):** After static fetch, parse the raw CSS and resolve any `background-image: url(...)` references into the asset inventory.

2. **Browser rendering (heavier):** Use the rendered page path and extract computed background-image URLs via `getComputedStyle`. Likely needed anyway for other transcription accuracy issues.

**Notes:** Given the broader accuracy challenges seen in this project, the browser rendering path may be the right long-term investment regardless. CSS parsing is the cheaper first step if we want a quick win.