---
uid: acceptance_criterion-8dc6b559
id: AC-825
type: acceptance_criterion
title: draftId is content-addressed from the canonical draft render and is stable
  across asset availability
created_by: xgd
created_at: '2026-06-30T06:24:06.940628+00:00'
updated_at: '2026-06-30T06:24:06.940628+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-bab9b773
  kind: behavior
  regression_only: false
---

## Criterion
The `draftId` is derived deterministically from the rendered draft content: two invocations on identical draft state return the same `draftId`, and any change to the draft that alters its rendered output yields a different `draftId`. The id reflects the canonical draft render (before any asset inlining), so changes to the bytes/availability of referenced assets alone do not change `draftId`.

## Verification
Invoke the tool twice on identical draft state and assert identical `draftId`; mutate the draft (e.g. change a heading) and assert a different `draftId`. Separately, change only a referenced asset's stored bytes/availability and assert `draftId` is unchanged.
