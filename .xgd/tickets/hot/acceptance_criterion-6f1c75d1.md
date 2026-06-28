---
uid: acceptance_criterion-6f1c75d1
id: AC-699
type: acceptance_criterion
title: Clearing on convert is unconditional and leaves no prior-draft residue
created_by: xgd
created_at: '2026-06-28T23:09:44.012151+00:00'
updated_at: '2026-06-28T23:09:44.012151+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-b3866352
  kind: behavior
  regression_only: false
---

## Criterion
The clear-to-scaffold step runs on every convert invocation regardless of the prior
draft's contents — including when the draft already holds modules, multiple pages, or
custom theme-token overrides, and including when the draft is already empty. After the
clear, no prior-draft modules, pages, or theme-token overrides survive; the draft is
the canonical empty scaffold only. There is no "preserve existing edits" branch.

## Verification
Seed the working draft with several modules, an extra page, and non-default theme
tokens, then convert. Assert the resulting cleared definition contains none of the
seeded modules/pages/theme overrides — only the single empty home page and default
theme. Convert again starting from an already-empty draft and assert the clear still
runs and yields the same canonical scaffold.
