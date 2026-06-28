---
uid: acceptance_criterion-80f9c480
id: AC-680
type: acceptance_criterion
title: Preview in-page anchor hashes do not switch pages; unknown pageId falls back
  to first page
created_by: xgd
created_at: '2026-06-28T22:24:37.299600+00:00'
updated_at: '2026-06-28T22:24:37.299600+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

In the preview iframe, only `#/<pageId>` fragment hashes switch pages. A bare in-page anchor hash (e.g. `#contact`) dispatched as a `hashchange` does not change the displayed page — the current page stays rendered so the browser can scroll within it. A `#/<pageId>` hash whose `pageId` matches no page in the site falls back to rendering the first page rather than producing a blank or error state.

## Verification

Render a 2-page site into a jsdom iframe via the preview driver while showing a non-home page. Set the hash to an in-page anchor such as `#contact` and dispatch `hashchange`; assert the displayed page is unchanged (same page's modules still present). Separately, set the hash to `#/nonexistent` and dispatch `hashchange`; assert the first page's modules are rendered (fallback to `site.pages[0]`).
