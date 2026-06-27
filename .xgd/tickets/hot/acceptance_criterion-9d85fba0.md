---
uid: acceptance_criterion-9d85fba0
id: AC-593
type: acceptance_criterion
title: Absent signals serialize as content, never as omission
created_by: xgd
created_at: '2026-06-27T01:11:00.377758+00:00'
updated_at: '2026-06-27T01:11:00.377758+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-3f73931a
  kind: behavior
  regression_only: false
---

## Criterion
Given an HTML document with few or no declared design signals, the produced digest is still complete: every individual signal field is present and carries either a detected value or the literal string `not_detected` (with array-typed fields present as empty arrays and the primary pair as `not_detected`). No field is `null`, `undefined`, or omitted on account of being absent — absence is represented as serialisable content so it can be read in the rendered digest.

## Verification
Run signal extraction against a minimal/empty HTML fixture → assert the digest's palette, typography, layout, imagery, and content sections all exist, every scalar field equals `not_detected` (or a real value), and there are no `null`/`undefined` fields anywhere in the signals.
