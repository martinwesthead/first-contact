---
uid: acceptance_criterion-cbc0313e
id: AC-792
type: acceptance_criterion
title: Each per-page transcription digest entry exposes a screenshotUrl
created_by: xgd
created_at: '2026-06-30T01:39:26.829661+00:00'
updated_at: '2026-06-30T01:39:26.829661+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f45a5e61
  kind: behavior
  regression_only: false
---

## Criterion
Each per-page entry of the transcription digest exposes a `screenshotUrl` field.
When the entry has a desktop screenshot key, `screenshotUrl` equals
`"/assets/" + screenshotKey` (the already-served assets path the AI can pass
directly to vision). When no screenshot key is present, `screenshotUrl` is the
empty string. The field is purely derived from the entry's screenshot key and
adds no new digest-derivation behaviour.

## Verification
Build a transcription digest where at least one page has a desktop screenshot key
and at least one does not. Assert that for every entry with a key,
`entry.screenshotUrl === "/assets/" + entry.screenshotKey`, and that for every
entry lacking a key, `entry.screenshotUrl === ""`.
