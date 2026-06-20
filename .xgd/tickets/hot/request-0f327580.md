---
uid: request-0f327580
id: REQ-37
type: request
title: Robust transcription pipeline with error reporting
created_by: xgd
created_at: '2026-06-20T21:08:41.521098+00:00'
updated_at: '2026-06-20T21:09:18.871157+00:00'
completed_at: null
last_field_updated: title
status: draft
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
---

The `transcribe_site` + `read_transcription_digest` flow needs to surface failures at each stage rather than silently continuing. Specifically:

- Each asset mirror should report success/failure individually

- The digest write should confirm before the tool returns

- `read_transcription_digest` should never return a stale or partial digest

- Tool call failures during the module-building phase should be collected and reported back to me as a summary so I can retry failed steps rather than silently missing them