---
uid: acceptance_criterion-95eca7b0
id: AC-788
type: acceptance_criterion
title: Static path fetches external stylesheets and adds their background-image assets
  to the inventory
created_by: xgd
created_at: '2026-06-30T01:17:23.733141+00:00'
updated_at: '2026-06-30T01:17:23.733141+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-3f73931a
  kind: behavior
  regression_only: false
---

## Criterion
Given an HTML document with one or more `<link rel="stylesheet">` references and a base URL, the static extraction path fetches each linked stylesheet through the shared fetch-safety layer and extracts every `background-image` / `background` url() value it declares — including those nested inside `@media` rules — adding each as a `kind: 'background'` asset record in the digest's asset inventory. Each url() is resolved to an absolute URL relative to the **stylesheet's own URL** (not the document). Discovery is deduped by absolute URL: a URL already present in the inventory (from `<img>`, inline/`<style>` backgrounds, or another stylesheet) keeps its original `kind` and has its `references` count incremented rather than producing a duplicate record; a genuinely new URL is appended with `references` = 1. The imagery summary's `backgroundCount` reflects the enriched inventory. `data:` URLs are excluded, and `@import` chains are not followed (documented limitation). A stylesheet that cannot be fetched is skipped without failing the extraction.

## Verification
Run static extraction against a page that links an external stylesheet declaring (a) a `background-image` inside a top-level rule, (b) a `background-image` inside an `@media` rule, (c) a `data:` URL, and (d) a url() relative path, where one of the absolute URLs also already appears as an `<img src>` in the inventory → assert the new stylesheet-only backgrounds appear once as `kind: 'background'` with absolute URLs resolved against the stylesheet, the `@media`-nested background is captured, the `data:` URL is absent, the already-present URL's record keeps `kind: 'img'` with its `references` incremented (no duplicate), `@import`-referenced backgrounds are absent, and the imagery summary `backgroundCount` matches the merged inventory. Run again with the stylesheet fetch returning a non-ok result → assert extraction still succeeds, falling back to inline/`<style>` backgrounds only.
