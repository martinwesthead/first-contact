---
uid: acceptance_criterion-2e7ea559
id: AC-624
type: acceptance_criterion
title: After consent, conversion proceeds and returns only a mechanical completion
  summary
created_by: xgd
created_at: '2026-06-28T20:10:19.255201+00:00'
updated_at: '2026-06-28T23:09:22.100262+00:00'
completed_at: null
last_field_updated: body
status: pending
fields:
  story_uid: story-b3866352
  kind: behavior
  regression_only: false
---

## Criterion
Triggering a convert of an analyzed source URL proceeds immediately — under any
starting condition, with no confirmation request, consent step, or prior approval —
and returns a completion result whose payload is the mechanical summary form: a
completion kind, a digest key, the cleared empty-scaffold site definition, and a
summary object containing page count, asset count, mirrored count, and mirror-failure
count. The payload contains no source-synthesized site, source-derived module list,
applied theme-token block, or narrative — the only site object present is the empty
cleared scaffold.

## Verification
Invoke the convert action for an analyzed URL with no prior consent or confirmation
recorded. Assert the result is success on the first invocation, the payload carries
the completion kind, a digest key, a cleared scaffold definition (one empty home
page, default theme), and a summary with the four integer counts, and that no
source-reconstructed site/modules/themeTokens/narrative fields appear.
