---
uid: acceptance_criterion-d1cd0ab1
id: AC-678
type: acceptance_criterion
title: Site renderer target option emits fragment page-nav hrefs in preview, absolute
  in production
created_by: xgd
created_at: '2026-06-28T22:24:27.771510+00:00'
updated_at: '2026-06-28T22:24:27.771510+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

The framework site renderer accepts a `target: 'preview' | 'production'` option (default `'production'`). When invoked as `renderSiteToHtml(site, { target: 'preview' })`, page-navigation links (nav entries whose target kind is `page`) are emitted as fragment hrefs `#/<pageId>`. With the default, with `target: 'production'`, or with the option omitted, the same page-nav links are emitted as absolute paths `/<pageId>`. Production output is byte-for-byte unchanged by the addition of the option; only the preview target alters page-nav href formatting (URL and in-page-anchor nav hrefs are identical across both targets).

## Verification

Render a 2-page site (e.g. home + menu) with a header carrying a `kind: 'page'` nav entry. Call `renderSiteToHtml(site, { target: 'preview' })` and assert the rendered nav block contains an `href="#/menu"` link. Call `renderSiteToHtml(site)` (default) and `renderSiteToHtml(site, { target: 'production' })` and assert both contain `href="/menu"` and neither contains `#/menu`. Assert the default and production-target outputs are identical.
