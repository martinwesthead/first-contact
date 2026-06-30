---
uid: report-0c96bdc1
id: REPORT-845
type: report
title: Claude reconciliation_uat_generation report
created_by: xgd
created_at: '2026-06-30T01:14:44.363420+00:00'
updated_at: '2026-06-30T01:14:44.363420+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: reconciliation_uat_generation
  subject_uid: story-d44dfd7c
---

All 9 UATs pass. Test names conform to the enforced `^test_UAT_AC\d+_\w+$` pattern.

```
UATs generated for story story-d44dfd7c (plan item 2 of 5)

Story: story-d44dfd7c
Test file(s) created:
  - tests/test_reconciliation_xgd_ticket_dev_tool.test.ts

Tests written: 9
Tests passed: 9
Tests failed: 0

test_files_created:
  - "tests/test_reconciliation_xgd_ticket_dev_tool.test.ts"
```

**One UAT per acceptance criterion (1:1 mapping):**

| Test | AC | Boundary | Verifies |
|---|---|---|---|
| `test_UAT_AC787_sidecar_spawns_allowed_command_in_project_cwd` | AC-787 | sidecar handler (injected spawn) | argv `["ticket",<cmd>,…]`, cwd=root, `{ok:true,stdout,stderr,exitCode}` |
| `test_UAT_AC786_sidecar_refuses_cwd_outside_project_root_with_500` | AC-786 | sidecar handler | 500 + cwd-guard error, no spawn (incl. prefix-sharing sibling); root/subdir spawn as control |
| `test_UAT_AC785_sidecar_rejects_unlisted_command_with_400` | AC-785 | sidecar handler | 400, error names create/list/get, no spawn |
| `test_UAT_AC784_action_surfaces_sidecar_failure_as_failed_result` | AC-784 | operator action (stubbed fetch) | non-2xx / unreachable / non-JSON → `failed`, error reflects sidecar |
| `test_UAT_AC783_action_routes_to_sidecar_and_surfaces_output` | AC-783 | operator action | POST `{command,args}` to sidecar URL → `ok` with stdout/stderr/exitCode, `kind:"xgd_ticket_result"` |
| `test_UAT_AC782_action_rejects_unlisted_command_without_request` | AC-782 | operator action | unlisted command → `failed`, fetch never called |
| `test_UAT_AC781_action_fails_closed_when_dev_tools_disabled` | AC-781 | operator action | flag off → `failed` (dev-only), fetch never called |
| `test_UAT_AC780_tool_present_with_command_enum_when_dev_enabled` | AC-780 | tool-set gating | tool present; command enum {create,list,get}, required, args optional string array |
| `test_UAT_AC779_tool_absent_when_dev_tools_disabled_any_tier` | AC-779 | tool-set gating | absent on default/false/paid tier |

No runtime code, existing tests, or tickets were modified. The existing `test_UAT_FC_REQ-46_*` files remain in place — they're the FC orphans that the reconciliation review/FC-orphan gate will rename or delete downstream.
