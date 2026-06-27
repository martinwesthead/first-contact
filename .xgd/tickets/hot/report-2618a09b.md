---
uid: report-2618a09b
id: REPORT-619
type: report
title: Claude reconciliation_uat_generation report
created_by: xgd
created_at: '2026-06-27T01:21:30.778345+00:00'
updated_at: '2026-06-27T01:21:30.778345+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: reconciliation_uat_generation
  subject_uid: story-3f73931a
---

Only the 11 new test files — no runtime code or existing tests touched. All pass, typecheck clean, names match the validator.

```
UATs generated for story story-3f73931a (plan item 6 of 7)

Story: story-3f73931a (Extract a reference website's design signals into a canonical Reference Digest)
Test file(s) created:
  - tests/test_UAT_AC587_palette_roles_inferred_with_capped_supporting.test.ts
  - tests/test_UAT_AC588_typography_declared_styles_and_primary_pair.test.ts
  - tests/test_UAT_AC589_layout_content_width_bias_density.test.ts
  - tests/test_UAT_AC590_asset_inventory_all_paths_with_counts.test.ts
  - tests/test_UAT_AC591_duplicate_asset_urls_collapse.test.ts
  - tests/test_UAT_AC592_content_structure_headings_nav_forms_counts.test.ts
  - tests/test_UAT_AC593_absent_signals_serialize_as_content.test.ts
  - tests/test_UAT_AC594_reference_digest_schema_validator.test.ts
  - tests/test_UAT_AC595_digest_renders_kms_aware_markdown.test.ts
  - tests/test_UAT_AC596_deterministic_whats_missing_list.test.ts
  - tests/test_UAT_AC597_escalation_never_triggers_static_path.test.ts

Tests written: 11 (one UAT per AC, AC-587 … AC-597)
Tests passed: 11
Tests failed: 0

test_files_created:
  - "tests/test_UAT_AC587_palette_roles_inferred_with_capped_supporting.test.ts"
  - "tests/test_UAT_AC588_typography_declared_styles_and_primary_pair.test.ts"
  - "tests/test_UAT_AC589_layout_content_width_bias_density.test.ts"
  - "tests/test_UAT_AC590_asset_inventory_all_paths_with_counts.test.ts"
  - "tests/test_UAT_AC591_duplicate_asset_urls_collapse.test.ts"
  - "tests/test_UAT_AC592_content_structure_headings_nav_forms_counts.test.ts"
  - "tests/test_UAT_AC593_absent_signals_serialize_as_content.test.ts"
  - "tests/test_UAT_AC594_reference_digest_schema_validator.test.ts"
  - "tests/test_UAT_AC595_digest_renders_kms_aware_markdown.test.ts"
  - "tests/test_UAT_AC596_deterministic_whats_missing_list.test.ts"
  - "tests/test_UAT_AC597_escalation_never_triggers_static_path.test.ts"
```

**Notes for downstream:**
- Each UAT exercises the package's real exported entry point at the boundary the AC names (`parsePalette`/`parseTypography`/`parseLayout`/`parseImagery`/`parseContent`/`extractSignals`/`deriveWhatsMissing`/`renderDigestMarkdown`/`ReferenceDigest` validator/`shouldEscalateToRendered`) via the established `../packages/extractor/src/index.js` relative import — matching the existing `test_UAT_FC_REQ-21_*` files. No internal mocking; assertions observe concrete output (role colours, dedup `references` counts, absolute URLs, classification, markdown structure, schema rejection).
- Each AC's two-scenario verification (populated vs sparse/empty) is covered within its single AC-named test, per the one-UAT-per-AC mapping.
- AC-597 is `regression_only` — included as instructed.
- The pre-existing `test_UAT_FC_REQ-21_*` tests covering the same behavior are the FC orphans this run's Phase-2 `check_fc_orphans` gate will rename/delete; my new `test_UAT_AC{N}_*` files are their AC-linked replacements.
