---
uid: acceptance_criterion-68890e40
id: AC-613
type: acceptance_criterion
title: 'Computed signals refine the digest: computed values win and computed background
  images join the inventory'
created_by: xgd
created_at: '2026-06-28T19:41:53.058200+00:00'
updated_at: '2026-06-28T19:41:53.058200+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-3f73931a
  kind: behavior
  regression_only: false
---

## Criterion
Merging computed styles from the rendered fetch into the static Layer A signals refines the digest: (a) computed typography (family/size/weight for body/h1/h2/h3) and computed palette background-colour override the declared values when the computed pass produced one; (b) a computed `background-image` URL the static parse did not produce — e.g. one declared only in an external stylesheet — is folded into the asset inventory as a `kind: 'background'` record (resolved to an absolute URL, references=1); (c) a computed URL that already exists in the inventory increments that record's `references` count rather than adding a duplicate. The imagery summary's background count reflects the merged inventory.

## Verification
Merge computed styles carrying one new background-image URL (from an external-stylesheet fixture) and one URL already present in the static inventory → assert the new URL appears exactly once as `kind: 'background'`, the already-present URL's `references` increments instead of duplicating, and computed typography/palette values replace the declared ones.
