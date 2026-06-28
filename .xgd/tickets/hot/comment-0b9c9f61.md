---
uid: comment-0b9c9f61
id: COMMENT-264
type: comment
title: Comment on acceptance_criterion AC-627
created_by: xgd
created_at: '2026-06-28T23:10:42.341935+00:00'
updated_at: '2026-06-28T23:10:42.341935+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  subject_uid: acceptance_criterion-e54d9f1c
  kind: change
---

Archived during reconciliation (BUNDLE-5, plan item 5: Convert flow — orchestration). REQ-35 removed the destructive-overwrite confirmation gate from the convert flow entirely: no requires_confirmation early return, no convertConfirmed consent storage, no confirm_convert operator action, and no convert-path 'I own this site' robots-override registration. The code this AC described no longer exists; transcribe_site now proceeds immediately on first invocation. Gate removal is documented on STORY-57 and the modified AC-624/AC-632; the underlying REQ-20 robotsOverrides storage is retained but no convert path writes to it.