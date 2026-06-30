---
uid: acceptance_criterion-bcdb9e40
id: AC-823
type: acceptance_criterion
title: Default-page preview returns a digest with all three viewport screenshots persisted
  under a previews namespace
created_by: xgd
created_at: '2026-06-30T06:23:58.678337+00:00'
updated_at: '2026-06-30T06:23:58.678337+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-bab9b773
  kind: behavior
  regression_only: false
---

## Criterion
When the assistant invokes `preview_generated_page` with no `pageId` on a draft that has at least one page, the tool returns a result of kind `preview_digest` for the draft's active (first) page. On the visual-capture path, all three viewport screenshots — mobile, tablet, and desktop — are produced and persisted, each stored under a `previews/{accountId}/{draftId}/{pageId}/` location that is distinct from the namespace used for external reference screenshots.

## Verification
Invoke the tool with no `pageId` against a draft with content and a working render path; assert the result kind is `preview_digest`, that the digest exposes screenshot references for all three viewports, and that each stored screenshot key begins with the `previews/{accountId}/{draftId}/{pageId}/` prefix (and not the references prefix).
