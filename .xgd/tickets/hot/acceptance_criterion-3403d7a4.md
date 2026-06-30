---
uid: acceptance_criterion-3403d7a4
id: AC-835
type: acceptance_criterion
title: Preview chat card leads with a screenshot strip and a draft-page-identifying
  header
created_by: xgd
created_at: '2026-06-30T06:25:24.199730+00:00'
updated_at: '2026-06-30T06:25:24.199730+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-bab9b773
  kind: behavior
  regression_only: false
---

## Criterion
When a preview digest with screenshots renders in the builder chat, the resulting card shows a screenshot strip as the first element of its body, with one image per available viewport (mobile/tablet/desktop) pointing at the persisted screenshot, and a header that identifies the card as a preview of the named draft page (distinct from an external reference card).

## Verification
Render the chat card from a preview digest payload that has all three screenshot keys; assert the first body element is the screenshot strip, that it contains one image element per present viewport referencing the screenshot key, and that the card header names the draft page.
