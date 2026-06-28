---
uid: acceptance_criterion-94f4e135
id: AC-697
type: acceptance_criterion
title: Static generation bakes resolved body content with no runtime content fetch
created_by: xgd
created_at: '2026-06-28T22:55:01.723619+00:00'
updated_at: '2026-06-28T22:55:01.723619+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ddc928fd
  kind: behavior
  regression_only: false
---

## Criterion
Static generation of a multi-page site whose modules use text-kind markdown references resolves and converts that content at build time and inlines the resulting HTML into the published static output, so the served site performs no content fetch or markdown conversion at request time.

## Verification
Generate static output for a site using text asset references and assert the produced HTML files contain the converted body content inlined. Assert the published-site request path makes no blob-store/content fetch for body copy when serving those pages.