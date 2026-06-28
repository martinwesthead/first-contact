---
uid: acceptance_criterion-dadce457
id: AC-692
type: acceptance_criterion
title: Convert capture writes per-section verbatim markdown and populates the digest
  copy reference
created_by: xgd
created_at: '2026-06-28T22:54:48.417336+00:00'
updated_at: '2026-06-28T22:54:48.417336+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ddc928fd
  kind: behavior
  regression_only: false
---

## Criterion
When an operator converts a content-bearing source site, the transcription captures each above-threshold source section's body as verbatim markdown and persists it as a per-section body-copy file in the assets namespace under a `sites/{siteId}/copy/...md` key. The resulting transcription digest carries, for each such captured content entry, a ready-made text-kind asset reference pointing at that file that validates against the asset-reference schema.

## Verification
Run the convert/transcription flow against an assets-heavy fixture site. Assert at least one `.md` body-copy file exists under the site's `copy/` key prefix, and that the matching digest content entry carries a populated, schema-valid text asset reference for it.