---
uid: acceptance_criterion-7b1e8f18
id: AC-625
type: acceptance_criterion
title: Confirmation is per-URL and does not blanket-authorize future conversions
created_by: xgd
created_at: '2026-06-28T20:10:22.438144+00:00'
updated_at: '2026-06-28T20:10:22.438144+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-b3866352
  kind: behavior
  regression_only: false
---

## Criterion
Consent authorizes conversion only for the specific URL it was recorded against.
Triggering a convert of a URL that has no recorded consent returns the
confirmation request again, even if a different URL was previously confirmed in
the same session. One confirmation never blanket-authorizes subsequent
conversions.

## Verification
Confirm URL A and convert it successfully. Then trigger a convert of URL B (no
consent recorded): assert the confirmation request is returned for B. Also assert
that an unconfirmed URL always re-prompts rather than proceeding.
