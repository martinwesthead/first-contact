---
uid: comment-312fd759
id: COMMENT-266
type: comment
title: Comment on acceptance_criterion AC-663
created_by: xgd
created_at: '2026-06-28T23:32:16.108727+00:00'
updated_at: '2026-06-28T23:32:16.108727+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  subject_uid: acceptance_criterion-1cb4f6e2
  kind: note
---

Archived during reconciliation of bundle-d4ce3987 (plan item 6: convert flow chat cards). REQ-35 removed the destructive-confirmation gate entirely — convert-confirmation.ts deleted, no renderer registered for kind 'convert_confirmation', and the fc:convert-confirmed / fc:convert-cancelled listener bridge removed. This AC describes Confirm/Cancel signalling the code no longer implements. Archived (not deleted) to preserve history.