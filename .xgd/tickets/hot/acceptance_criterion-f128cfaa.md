---
uid: acceptance_criterion-f128cfaa
id: AC-450
type: acceptance_criterion
title: Google Fonts preconnect, preload, and stylesheet links are emitted when the
  site's typography families resolve via the vetted shortlist
created_by: xgd
created_at: '2026-06-25T01:24:24.906991+00:00'
updated_at: '2026-06-25T01:24:24.906991+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-d111f966
  kind: behavior
  regression_only: false
---

## Criterion

When the site theme's heading or body typography family declaration matches an entry in the vetted Google Fonts shortlist, the rendered page's `<head>` emits:

- `<link rel="preconnect" href="https://fonts.googleapis.com">`,
- `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`,
- `<link rel="preload" as="style" href="<google-fonts-url>">`,
- `<link rel="stylesheet" href="<google-fonts-url>">`,

where the Google Fonts URL covers exactly the resolved fonts (deduplicated). When neither family resolves via the shortlist, none of these font-related links are emitted.

## Verification

Generate two fixture sites: one whose theme uses two distinct vetted families (e.g. Manrope for headings, Inter for body) and one whose theme uses only families absent from the shortlist. For the first, parse the emitted `<head>` and assert presence of both preconnect tags, the preload link, and the stylesheet link, each pointing at a Google Fonts URL whose `family` query covers the two vetted families. For the second, assert that no Google Fonts link tags appear.
