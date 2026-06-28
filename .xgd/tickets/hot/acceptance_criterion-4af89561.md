---
uid: acceptance_criterion-4af89561
id: AC-695
type: acceptance_criterion
title: The reproduce-a-website how-to instructs setting pre-built copy verbatim, not
  authoring it
created_by: xgd
created_at: '2026-06-28T22:54:56.316931+00:00'
updated_at: '2026-06-28T22:54:56.316931+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ddc928fd
  kind: behavior
  regression_only: false
---

## Criterion
The published AI how-to for reproducing a website instructs the model to set body-copy fields from the digest's pre-built values — the per-entry text asset reference when present, or the inline markdown when present — with a worked example for each, and no longer instructs the model to author or paraphrase body copy.

## Verification
Inspect the reproduce-a-website how-to content surfaced to the model. Assert it references using the digest's pre-built copy reference and inline-markdown values for body fields with worked examples, and contains no instruction to write/compose body text.