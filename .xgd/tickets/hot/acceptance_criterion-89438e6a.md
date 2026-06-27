---
uid: acceptance_criterion-89438e6a
id: AC-609
type: acceptance_criterion
title: A failed or malformed reference_digest tool_result renders a non-info card
  instead of a digest
created_by: xgd
created_at: '2026-06-27T01:26:21.235897+00:00'
updated_at: '2026-06-27T01:26:21.235897+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-15bae45e
  kind: behavior
  regression_only: false
---

## Criterion
When the tool_result is a failure, the card renders in a danger tone indicating the analysis failed. When the result is successful but missing the digest/markdown data, the card renders in a warning tone indicating an invalid payload. In neither case is a digest body rendered.

## Verification
Pass (1) a failed tool_result → assert a danger-toned card with a failure message and no digest body; (2) a successful result whose payload lacks `digest`/`digestMarkdown` → assert a warning-toned card indicating missing data.
