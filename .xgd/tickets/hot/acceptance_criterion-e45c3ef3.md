---
uid: acceptance_criterion-e45c3ef3
id: AC-632
type: acceptance_criterion
title: Conversion is purely mechanical with no internal-synthesis fallback path
created_by: xgd
created_at: '2026-06-28T20:11:25.416671+00:00'
updated_at: '2026-06-28T20:11:25.416671+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-b3866352
  kind: behavior
  regression_only: true
---

## Criterion
The convert flow has no internal LLM site-synthesis step and no fallback path that
switches to legacy synthesis behavior. The conversion always produces the
mechanical digest artifact and the digest-key+summary result; under no input does
it return a synthesized site/module/theme/narrative payload, and there is no
conditional selecting between "old" and "new" transcription behavior.

## Verification
Exercise the conversion across success and edge inputs; assert the result is
always the mechanical summary form and never a synthesized-site payload. Confirm
no legacy/fallback synthesis branch is reachable in the convert orchestration.
