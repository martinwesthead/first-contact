---
uid: acceptance_criterion-f70ca037
id: AC-591
type: acceptance_criterion
title: Duplicate asset URLs collapse to one record with a references count and first-discovered
  kind
created_by: xgd
created_at: '2026-06-27T01:10:42.874309+00:00'
updated_at: '2026-06-27T01:10:42.874309+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-3f73931a
  kind: behavior
  regression_only: false
---

## Criterion
Given an HTML document where the same absolute asset URL is referenced more than once (across any combination of reference paths), the digest's asset inventory contains exactly one record for that URL whose `references` count equals the number of appearances. The record's `kind` is the kind of the first discovery path in which the URL was found; discovery order is `<img>` first, so a URL appearing as both an `<img>` and a background-image is reported as `kind: img`.

## Verification
Run imagery extraction against a fixture where one URL appears as an `<img src>` and again as a `<style>`-block `background-image`, and a second URL appears twice as background-images → assert each URL yields a single inventory record, the first carries `kind: img` with `references` 2, and the second carries `kind: background` with `references` 2.
