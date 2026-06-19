---
uid: bug-2ede2797
id: BUG-3
type: bug
title: 'Builder preview: multi-page nav links navigate iframe to control-app root'
created_by: xgd
created_at: '2026-06-19T23:43:35.267511+00:00'
updated_at: '2026-06-19T23:53:09.760240+00:00'
completed_at: null
last_field_updated: status
status: free_coded
fields:
  priority: high
  severity: high
  story_points: 3
  auto_merge_back: true
  needs_review: false
  commits:
  - ccfd392b7a07ed5490ace376b3f2b47ede5cf15a
  version: 0.14.1236
---

## Symptom

In the builder at http://localhost:8788/builder?site=1stcontact, after a successful convert flow against a multi-page source site, clicking any page tab in the rendered preview iframe navigates the iframe away to `http://localhost:8788/<slug>`, which hits the control-app catch-all and renders the text **"Hello from app.1stcontact.io"**.

Reproduction: convert any multi-page source (e.g. `https://joyfulculinarycreations.com/`); wait for the converted site to land; click any non-home page tab in the preview; iframe replaces itself with the control-app root response.

## Root cause

The framework renderer is shared between two emission targets — the production Astro static-site generator and the in-browser builder preview — but the nav-href format only matches production.

- `packages/framework/src/render/browser.ts:147-152` — `navHref` returns absolute paths like `/menu`, `/contact`. Correct for production (Astro emits separate HTML files per page).
- `packages/builder-ui/src/preview.ts:9-19` — the preview iframe is populated via `document.open / write / close` with the single-document HTML produced by `renderSiteToHtml`. There is **no link-click interception** and no client-side page-switching logic.
- `apps/control-app/src/index.ts:63-66` — the worker's catch-all returns "Hello from app.1stcontact.io" for any unknown path, so the iframe's navigation to `/menu` ends up rendering that.

The preview was built to display a single page and the multi-page case was never finished — the renderer adopted the production link format wholesale.

## Fix

Make the preview iframe handle in-document page switching without an HTTP round trip. Two viable shapes:

1. **Fragment-based nav** (preferred for minimal renderer touch): emit `#/menu` from `navHref` when the renderer is invoked in preview mode (new `target: 'preview' | 'production'` option, default production for backward compat); the preview driver (`renderSiteIntoIframe`) installs a `hashchange` listener on the iframe's `contentWindow` that re-runs `renderSiteToHtml(site, { pageId })` for the matched page and re-writes the iframe.
2. **Click-interception nav**: keep `navHref` as `/menu`; preview driver intercepts `click` on all anchor elements inside the iframe, prevents default, parses the path → pageId, re-renders.

Shape 1 is more declarative and survives the case where the iframe is reloaded by other means. Implement that.

Production output is unchanged — the new `target` option defaults to production.

## Test plan

UATs in `tests/test_UAT_FC_BUG-XX_*`:

1. **Renderer respects target option**: `renderSiteToHtml(site, { target: 'preview' })` produces nav links with `#/menu` hrefs; default / `target: 'production'` produces `/menu`. Render a 2-page site, grep the resulting HTML's nav block.
2. **Preview iframe handles hashchange**: with a 2-page site rendered into a jsdom iframe via `renderSiteIntoIframe`, dispatch a `hashchange` to `#/menu` on the iframe's content window. Assert the iframe's body is now rendering the `menu` page's modules (e.g. a unique module id from page 2 is present).
3. **No regression on home page**: clicking the home-page nav link (hash `#/`) re-renders the home page; the home modules are visible; the menu modules are gone.

Regression scope: existing REQ-8 preview UATs (`test_UAT_FC_REQ-8_tool_call_applies_to_preview.test.ts`, `test_UAT_FC_REQ-8_preview_fills_panel_height.test.ts`) — both pass after the change.