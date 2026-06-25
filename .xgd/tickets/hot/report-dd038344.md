---
uid: report-dd038344
id: REPORT-509
type: report
title: Claude reconciliation_uat_generation report
created_by: xgd
created_at: '2026-06-25T02:09:14.971834+00:00'
updated_at: '2026-06-25T02:09:14.971834+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: reconciliation_uat_generation
  subject_uid: story-ba9f2715
---

## Completion Report

```
UATs generated for story story-ba9f2715 (plan item 9 of 9)

Story: story-ba9f2715
Test file(s) created:
  - tests/test_UAT_AC477_builder_route_serves_spa_shell.test.ts
  - tests/test_UAT_AC478_chat_panel_collapses_to_restore_rail.test.ts
  - tests/test_UAT_AC479_restore_rail_left_of_preview.test.ts
  - tests/test_UAT_AC480_splitter_drag_resizes_and_clamps.test.ts
  - tests/test_UAT_AC481_viewport_presets_resize_iframe.test.ts
  - tests/test_UAT_AC482_preview_iframe_fills_panel_height.test.ts
  - tests/test_UAT_AC483_accepted_tool_call_advances_site.test.ts
  - tests/test_UAT_AC484_rejected_tool_call_leaves_state_unchanged.test.ts
  - tests/test_UAT_AC485_site_definition_persists_to_storage.test.ts
  - tests/test_UAT_AC486_chat_endpoint_proxies_anthropic.test.ts
  - tests/test_UAT_AC487_chat_endpoint_error_status_codes.test.ts

Tests written: 11
Tests passed: 11
Tests failed: 0

test_files_created:
  - "tests/test_UAT_AC477_builder_route_serves_spa_shell.test.ts"
  - "tests/test_UAT_AC478_chat_panel_collapses_to_restore_rail.test.ts"
  - "tests/test_UAT_AC479_restore_rail_left_of_preview.test.ts"
  - "tests/test_UAT_AC480_splitter_drag_resizes_and_clamps.test.ts"
  - "tests/test_UAT_AC481_viewport_presets_resize_iframe.test.ts"
  - "tests/test_UAT_AC482_preview_iframe_fills_panel_height.test.ts"
  - "tests/test_UAT_AC483_accepted_tool_call_advances_site.test.ts"
  - "tests/test_UAT_AC484_rejected_tool_call_leaves_state_unchanged.test.ts"
  - "tests/test_UAT_AC485_site_definition_persists_to_storage.test.ts"
  - "tests/test_UAT_AC486_chat_endpoint_proxies_anthropic.test.ts"
  - "tests/test_UAT_AC487_chat_endpoint_error_status_codes.test.ts"
```

One self-correction during the run: AC-485 initially asserted `palette.secondary` (which the starter site does not declare); I switched it to a `set_site_config` businessName edit to match the FC-equivalent pattern and the actual catalog/site shape. All 11 UATs now pass.
