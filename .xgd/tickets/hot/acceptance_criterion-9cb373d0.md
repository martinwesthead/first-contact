---
uid: acceptance_criterion-9cb373d0
id: AC-637
type: acceptance_criterion
title: 'Per-page plan: single-page entry shape and content'
created_by: xgd
created_at: '2026-06-28T20:29:22.845558+00:00'
updated_at: '2026-06-28T20:29:22.845558+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f45a5e61
  kind: behavior
  regression_only: false
---

## Criterion
For a single-page source, the blueprint's per-page plan contains exactly one entry. That entry carries: the page URL; a slug derived from the URL path (`/` for the site root); a non-empty human-readable title; a desktop screenshot reference (which may be empty when no screenshot was captured); an extracted-content list projecting the page's headings, nav links, and form fields as content blocks; and an ordered list of suggested module-type hints. The home page is always the first entry.

## Verification
Produce a blueprint for a single root URL; assert the per-page plan has length one, entry URL matches the source, slug is `/`, title is a non-empty string, and both the extracted-content and suggested-module-type lists are present arrays. Seed headings/nav/form-field signals and assert each surfaces as a corresponding content block.
