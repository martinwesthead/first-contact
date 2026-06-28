---
uid: acceptance_criterion-08872806
id: AC-635
type: acceptance_criterion
title: Theme tokens derived from source palette and typography
created_by: xgd
created_at: '2026-06-28T20:29:16.918923+00:00'
updated_at: '2026-06-28T20:29:16.918923+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f45a5e61
  kind: behavior
  regression_only: false
---

## Criterion
When the source's Reference Digest detects palette and typography, the transcription blueprint's theme tokens carry those values: the detected background, body-text, accent, and call-to-action colours each populate the corresponding theme palette slot, and the detected body and heading font families populate the typography families. Colours are normalised to lowercase with a leading `#` (e.g. `ABCDEF` and `#0F172A` both surface as `#abcdef` / `#0f172a`). Slots the digest did not detect retain the framework's default token value. The mapping is deterministic — the same digest always yields the same tokens.

## Verification
Derive theme tokens from a digest with all four palette roles and a body/heading font pair; assert the blueprint's palette slots equal the normalised source colours, the typography families equal the source pair, and unrelated default slots (e.g. surface, type scale) are unchanged. Re-derive and assert identical output.
