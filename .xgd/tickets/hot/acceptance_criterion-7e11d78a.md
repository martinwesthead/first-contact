---
uid: acceptance_criterion-7e11d78a
id: AC-590
type: acceptance_criterion
title: Asset inventory captures every visual asset across all reference paths with
  per-kind counts
created_by: xgd
created_at: '2026-06-27T01:10:38.030095+00:00'
updated_at: '2026-06-27T01:10:38.030095+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-3f73931a
  kind: behavior
  regression_only: false
---

## Criterion
Given an HTML document and a base URL, the digest's asset inventory lists one record per distinct visual asset discovered across all reference paths: `<img src>` and each `srcset` URL (`kind: img`); inline `style="background-image: url(...)"` and `<style>`-block `background-image` rules (`kind: background`); and `<video src>` plus nested `<source src>` (`kind: video`). Every record carries an absolute `url` (resolved against the base URL), a `kind`, a `classification` (`hero | product | headshot | testimonial | decorative | unknown`), an optional `alt`/`width`/`height`, and a `references` count. Separately, the digest's imagery summary reports `imgCount`, `backgroundCount`, `videoCount`, and a boolean `heroDetected`.

## Verification
Run imagery extraction against a fixture containing two `<img>` (one large near the top, one small in a `<nav>`), an inline background-image, a `<style>`-block background-image, and a `<video src>` → assert the inventory contains a record per asset with absolute URLs and the expected `kind`s, the small nav image is classified `decorative`, the large top image is classified `hero`, and the summary counts (`imgCount`/`backgroundCount`/`videoCount`) and `heroDetected` match the inventory.
