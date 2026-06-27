---
uid: acceptance_criterion-86f2d4a7
id: AC-598
type: acceptance_criterion
title: Analyzing a valid URL returns a reference_digest result with the full digest,
  its markdown, and a cache-miss marker
created_by: xgd
created_at: '2026-06-27T01:25:51.072851+00:00'
updated_at: '2026-06-27T01:25:51.072851+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-15bae45e
  kind: behavior
  regression_only: false
---

## Criterion
When the analyze action runs against a valid, fetchable URL for which intent is established and no cached digest exists, it returns a success result whose payload is tagged `kind: "reference_digest"` and contains: the full Reference Digest object (schemaVersion 1, all five signal categories present), the pre-rendered digest markdown string, and a cache indicator equal to `MISS`.

## Verification
Invoke the analyze action through the operator dispatch against a static HTML fixture with a populated cache binding. Assert the result is a success carrying `kind="reference_digest"`, `payload.digest.schemaVersion === 1`, all five signal categories (palette, typography, layout, imagery, content) present on `payload.digest.signals`, a non-empty `payload.digestMarkdown`, and `payload.cache === "MISS"`.
