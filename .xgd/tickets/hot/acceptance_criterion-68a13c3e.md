---
uid: acceptance_criterion-68a13c3e
id: AC-824
type: acceptance_criterion
title: Preview digest carries previewSource provenance (account, draft, page, ISO
  capture time)
created_by: xgd
created_at: '2026-06-30T06:24:02.915561+00:00'
updated_at: '2026-06-30T06:24:02.915561+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-bab9b773
  kind: behavior
  regression_only: false
---

## Criterion
The returned preview digest carries a `previewSource` provenance block identifying it as the assistant's own draft (not an external reference): the requesting account's id, a non-empty `draftId`, the resolved `pageId`, and an ISO-8601 `capturedAt` timestamp.

## Verification
Invoke the tool and assert the digest's `previewSource` contains the expected `accountId`, a non-empty `draftId`, the resolved `pageId`, and a `capturedAt` that parses as an ISO-8601 timestamp.
