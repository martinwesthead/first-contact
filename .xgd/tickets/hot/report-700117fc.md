---
uid: report-700117fc
id: REPORT-792
type: report
title: Claude reconciliation_story_generation report
created_by: xgd
created_at: '2026-06-29T22:27:33.948518+00:00'
updated_at: '2026-06-29T22:27:33.948518+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: reconciliation_story_generation
  subject_uid: bundle-4e8020d6
  plan_item_index: '5'
---

Both ACs are linked to STORY-46, `story_kind: upgrade`, and the working tree is clean (no runtime code touched). Mutations applied and verified against the actual code (`apps/control-app/src/chat.ts` per-call try/catch + `apply_tool_call_threw` log + `ChatHandlerDeps.applyToolCall`; `chat-driver.ts` / `store.ts` / `chat-panel.ts` `pendingToolFailures` banner + re-injection) and the FC tests.

```
Upgrade mutations applied for plan item 5 of 7

Target Stories: story-ba9f2715
Primary Story UID: story-ba9f2715
Stories Modified: 1
ACs Modified: 0
ACs Added: 2
ACs Removed: 0

tickets_modified:
  stories:
    - "story-ba9f2715"   # STORY-46 — body extended (per-call failure integrity + failure banner/re-injection); story_kind=upgrade
  acceptance_criteria:
    modified: []
    added:
      - "acceptance_criterion-b09e1d20"   # AC-734 — throwing call yields one ok:false result, batch survives, apply_tool_call_threw logged
      - "acceptance_criterion-3aafc494"   # AC-735 — dismissable failure banner + synthetic system-message re-injection on next turn
    removed: []

Progress: 5 of 7 plan items complete
```

**Notes**
- Both ACs extend STORY-46's existing tool-call result contract (AC-483 accepted / AC-484 rejected) — no new capability bucket, no parallel chat surface; classified correctly as upgrade.
- AC wording stays at observable boundaries (SSE/`tool_result` wire shape, `is_error`, the `apply_tool_call_threw` observability event, banner DOM data-attrs), matching the established style of sibling ACs AC-730/AC-731.
- Intent (REQ-38 + REQ-37 client, per the bundle body) matches the code exactly; no divergence requiring a Technical Context caveat beyond what's now documented. REQ-38's structural dependency on REQ-36's SSE refactor (plan dep 5→4) is recorded in the story's Technical Context.
