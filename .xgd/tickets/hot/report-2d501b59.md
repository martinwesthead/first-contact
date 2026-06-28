---
uid: report-2d501b59
id: REPORT-747
type: report
title: Claude reconciliation_story_generation report
created_by: xgd
created_at: '2026-06-28T22:55:15.119805+00:00'
updated_at: '2026-06-28T22:55:15.119805+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: reconciliation_story_generation
  subject_uid: bundle-d4ce3987
  plan_item_index: '4'
---

```
Story #4 created for reconciliation bundle-d4ce3987

Story UID: story-ddc928fd (STORY-62)
Title: Markdown body copy: inline-or-file content with verbatim convert capture
Type: feature
Capability: CAP-49 (capability-a83368ba) — Markdown Body Content & Verbatim Capture (new)
Acceptance Criteria: 14 created (AC-684 … AC-697)

Progress: 4 of 8 plan items complete
```

**Notes for traceability:**
- REQ-33 is genuinely a new capability bucket (markdown-as-content / text AssetRefs / verbatim mechanical capture / render-time conversion), so a new capability **CAP-49** was created rather than extending an existing one — consistent with the plan's `feature` classification and `uncovered` coverage status.
- The story scopes the **text/markdown half only**; the image-AssetRef sibling (BUG-5, plan item 7) is documented separately and cross-referenced in Technical Context.
- The 14 ACs map 1:1 to the operator's stated REQ-33 acceptance criteria, rephrased as behavioral/observable assertions (schema validation outcomes, rendered HTML, capture artifacts as interface contracts, end-to-end verbatim equality, no-runtime-fetch static output). All are positive-behavior ACs — no `regression_only` flags were needed, since REQ-33 adds capability rather than removing a superseded path.
