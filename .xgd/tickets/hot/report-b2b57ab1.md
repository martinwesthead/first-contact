---
uid: report-b2b57ab1
id: REPORT-475
type: report
title: Claude reconciliation_uat_generation report
created_by: xgd
created_at: '2026-06-25T00:45:07.525978+00:00'
updated_at: '2026-06-25T00:45:07.525978+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: reconciliation_uat_generation
  subject_uid: story-aecb7377
---

All 12 tests pass — exactly one test function per AC.

```
UATs generated for story story-aecb7377 (plan item 2 of 9)

Story: story-aecb7377
Test file(s) created:
  - tests/test_UAT_AC391_valid_minimal_site_narrows_to_typed_site.test.ts
  - tests/test_UAT_AC392_valid_full_site_validates.test.ts
  - tests/test_UAT_AC393_module_instance_missing_required_field_rejected.test.ts
  - tests/test_UAT_AC394_nav_pattern_outside_enum_rejected.test.ts
  - tests/test_UAT_AC395_missing_theme_token_slot_rejected.test.ts
  - tests/test_UAT_AC396_non_hex_palette_value_rejected.test.ts
  - tests/test_UAT_AC397_catalog_membership_not_validated.test.ts
  - tests/test_UAT_AC398_validator_returns_validation_errors_with_json_pointer_paths.test.ts
  - tests/test_UAT_AC399_theme_tokens_enforces_locked_superset.test.ts
  - tests/test_UAT_AC400_content_value_admits_primitives_assetref_arrays_objects.test.ts
  - tests/test_UAT_AC401_duplicate_module_ids_rejected.test.ts
  - tests/test_UAT_AC402_duplicate_page_slugs_rejected.test.ts

Tests written: 12
Tests passed: 12
Tests failed: 0

test_files_created:
  - "tests/test_UAT_AC391_valid_minimal_site_narrows_to_typed_site.test.ts"
  - "tests/test_UAT_AC392_valid_full_site_validates.test.ts"
  - "tests/test_UAT_AC393_module_instance_missing_required_field_rejected.test.ts"
  - "tests/test_UAT_AC394_nav_pattern_outside_enum_rejected.test.ts"
  - "tests/test_UAT_AC395_missing_theme_token_slot_rejected.test.ts"
  - "tests/test_UAT_AC396_non_hex_palette_value_rejected.test.ts"
  - "tests/test_UAT_AC397_catalog_membership_not_validated.test.ts"
  - "tests/test_UAT_AC398_validator_returns_validation_errors_with_json_pointer_paths.test.ts"
  - "tests/test_UAT_AC399_theme_tokens_enforces_locked_superset.test.ts"
  - "tests/test_UAT_AC400_content_value_admits_primitives_assetref_arrays_objects.test.ts"
  - "tests/test_UAT_AC401_duplicate_module_ids_rejected.test.ts"
  - "tests/test_UAT_AC402_duplicate_page_slugs_rejected.test.ts"
```
