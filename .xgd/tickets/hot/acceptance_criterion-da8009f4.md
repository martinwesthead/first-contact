---
uid: acceptance_criterion-da8009f4
id: AC-726
type: acceptance_criterion
title: Slug-collision suggestions return multiple distinct valid, non-reserved alternatives
created_by: xgd
created_at: '2026-06-29T21:29:11.122471+00:00'
updated_at: '2026-06-29T21:29:11.122471+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a3283461
  kind: behavior
  regression_only: false
---

## Criterion
Given a taken slug, the collision-suggestion function returns at least three alternative slugs. Every returned alternative is itself a well-formed slug, is not a reserved slug, is distinct from the others, and is not equal to the input slug.

## Verification
Call the suggestion function with a taken slug (e.g. `taken`): assert the result has at least three entries, each passing the slug validity check, none reserved, none equal to the input, and all mutually distinct.
