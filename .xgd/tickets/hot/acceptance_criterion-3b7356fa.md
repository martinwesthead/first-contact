---
uid: acceptance_criterion-3b7356fa
id: AC-662
type: acceptance_criterion
title: Convert confirmation card renders with destructive prompt, ownership checkbox,
  and Confirm/Cancel actions
created_by: xgd
created_at: '2026-06-28T20:55:15.982353+00:00'
updated_at: '2026-06-28T20:55:15.982353+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-2524a1ae
  kind: behavior
  regression_only: false
---

## Criterion
When the convert flow signals that confirmation is required, the builder chat renders a warning-toned card titled "Convert site" whose body contains: the destructive-overwrite prompt text (naming the target URL and stating the change cannot be automatically undone), an "I own this site" checkbox that is unchecked by default, and an actions row with a Confirm action and a Cancel action.

## Verification
Render the "confirmation required" tool result into the chat. Assert the card tone is the warning tone, the title reads "Convert site", the body shows the prompt text referencing the URL and the "cannot be automatically undone" wording, the ownership checkbox is present and unchecked, and both Confirm and Cancel actions are present.
