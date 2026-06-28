---
uid: acceptance_criterion-b12d81c8
id: AC-597
type: acceptance_criterion
title: A thin static body escalates to the rendered path; a content-rich body stays
  on the static path
created_by: xgd
created_at: '2026-06-27T01:11:26.883539+00:00'
updated_at: '2026-06-28T19:40:56.045558+00:00'
completed_at: null
last_field_updated: title
status: pending
fields:
  story_uid: story-3f73931a
  kind: behavior
  regression_only: false
---

## Criterion
The escalation decision inspects the static fetch and reports whether to escalate to the rendered path. Given a fetched document whose visible `<body>` text is under 200 characters (a thin SPA shell), the decision reports `escalate: true` with reason `thin_body`. Given a content-rich document whose visible body text meets or exceeds the threshold (and is not JS-dominant or force-rendered), the decision reports `escalate: false` (reason `sufficient`) and analysis stays on the static fetch path.

## Verification
Invoke the escalation decision against (a) an HTML shell whose body renders fewer than 200 visible characters → assert `escalate: true` and reason `thin_body`; and (b) a content-rich HTML page with ample visible body text → assert `escalate: false`.