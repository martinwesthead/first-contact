---
uid: acceptance_criterion-e45c3ef3
id: AC-632
type: acceptance_criterion
title: Conversion is purely mechanical with no internal-synthesis fallback path
created_by: xgd
created_at: '2026-06-28T20:11:25.416671+00:00'
updated_at: '2026-06-28T23:09:26.629971+00:00'
completed_at: null
last_field_updated: body
status: pending
fields:
  story_uid: story-b3866352
  kind: behavior
  regression_only: true
---

## Criterion
The convert flow has no internal LLM site-synthesis step, no legacy/fallback
synthesis branch, and no confirmation/consent branch. The conversion always runs
end-to-end and produces the mechanical digest artifact plus the digest-key + cleared
scaffold + summary result; under no input does it return a source-synthesized
site/module/theme/narrative payload. The only site object the flow ever emits is the
empty cleared scaffold; there is no conditional selecting between "old" and "new"
transcription behavior, and no path that gates conversion behind a confirmation.

## Verification
Exercise the conversion across success and edge inputs; assert the result is always
the mechanical summary form (carrying only the empty cleared scaffold as its site
object) and never a source-reconstructed-site payload. Confirm no legacy/fallback
synthesis branch and no confirmation-gate branch is reachable in the convert
orchestration.
