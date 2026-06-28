---
uid: acceptance_criterion-2e7ea559
id: AC-624
type: acceptance_criterion
title: After consent, conversion proceeds and returns only a mechanical completion
  summary
created_by: xgd
created_at: '2026-06-28T20:10:19.255201+00:00'
updated_at: '2026-06-28T20:10:19.255201+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-b3866352
  kind: behavior
  regression_only: false
---

## Criterion
Once the operator has recorded consent for a URL, re-triggering the convert of
that URL proceeds and returns a completion result whose payload is the mechanical
summary form: a completion kind, a digest key, and a summary object containing
page count, asset count, mirrored count, and mirror-failure count. The result
contains no synthesized site, module list, theme-token block, or narrative.

## Verification
Record consent for the URL, then invoke the convert action. Assert the result is
success, the payload identifies the completion (digest key present) and a summary
with the four integer counts, and that no site/modules/themeTokens/narrative
fields appear in the payload.
