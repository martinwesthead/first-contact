---
uid: acceptance_criterion-eafe593e
id: AC-622
type: acceptance_criterion
title: 'End-to-end: pasting a JS-SPA URL escalates analysis and renders a digest card
  with all three screenshots, computed typography, and computed background-image inventory'
created_by: xgd
created_at: '2026-06-28T19:58:18.048259+00:00'
updated_at: '2026-06-28T19:58:18.048259+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-15bae45e
  kind: behavior
  regression_only: false
---

## Criterion
When the operator pastes a JS-SPA URL and `analyze_page` runs end-to-end, escalation fires and the produced `reference_digest` tool_result drives a Digest Report card that shows all three viewport screenshots, computed typography resolved by the rendered path, and a computed-only background-image URL (one the static parse missed) folded into the asset inventory as a `background` record. The card's screenshot strip shows three images and the inventory's background group includes the computed hero background.

## Verification
Run `analyze_page` against a JS-SPA fixture with an injected rendered driver, then pass the resulting tool_result to the Digest Report renderer. Assert the digest has `fetchPath: "rendered"`, three screenshot keys, computed body typography, and a `kind: "background"` asset for the computed-only hero URL; and that the rendered card shows three screenshot figures and at least one background thumbnail.
