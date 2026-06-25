---
uid: acceptance_criterion-67e16581
id: AC-449
type: acceptance_criterion
title: Page <head> emits viewport, title, optional description, and Open Graph metadata
  with seoMeta-first fallback chain
created_by: xgd
created_at: '2026-06-25T01:24:18.692408+00:00'
updated_at: '2026-06-25T01:24:18.692408+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-d111f966
  kind: behavior
  regression_only: false
---

## Criterion

Every rendered page's `<head>` includes:

- a viewport meta tag (`width=device-width, initial-scale=1`),
- a `<title>` element whose text is taken from the page's `seoMeta.title` if present, else the page's `title` field, else the site config's business name,
- an `og:title` meta whose content matches the resolved title above,
- when a description is resolvable (page `seoMeta.description` if present, else site config `tagline`), both a `<meta name="description">` and an `<meta property="og:description">` carrying that description,
- when the page's `seoMeta.ogImage` is present, an `<meta property="og:image">` carrying that URL.

## Verification

Generate fixture sites that exercise: (a) a page with full `seoMeta` (title, description, ogImage), (b) a page with no `seoMeta` but with a `title` and a site `tagline`, and (c) a page with no `seoMeta` and no page title. For each case, assert that the emitted `<head>` contains the expected viewport, title, og:title, description / og:description (when resolvable), and og:image (when supplied).
