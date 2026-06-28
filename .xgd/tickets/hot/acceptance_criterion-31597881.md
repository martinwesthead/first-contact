---
uid: acceptance_criterion-31597881
id: AC-679
type: acceptance_criterion
title: 'Preview iframe hashchange to #/<pageId> re-renders that page in place with
  no HTTP request'
created_by: xgd
created_at: '2026-06-28T22:24:34.476421+00:00'
updated_at: '2026-06-28T22:24:34.476421+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

When a 2-page site is rendered into the preview iframe, dispatching a `hashchange` event whose hash is `#/<pageId>` on the iframe's content window re-renders that page's modules in place — without any HTTP request and without navigating the iframe away to a control-app URL. Setting the hash to `#/` (or `#`) returns the preview to the home (first) page. The re-render replaces the iframe document in-place, so a module unique to the target page becomes visible and modules from the previously shown page are gone.

## Verification

Render a 2-page site into a jsdom iframe via the preview driver. Set the iframe content window's hash to `#/menu` and dispatch a `hashchange` event; assert a module id unique to the menu page is now present in the iframe document and the home-page modules are absent. Set the hash to `#/` and dispatch `hashchange`; assert the home-page modules are present again and the menu module is gone. Assert no network/HTTP fetch for a page URL occurred during switching (the iframe document is rewritten in place).
