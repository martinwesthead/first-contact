---
uid: report-0bcdfad5
id: REPORT-497
type: report
title: Claude reconciliation_uat_generation report
created_by: xgd
created_at: '2026-06-25T01:32:19.806340+00:00'
updated_at: '2026-06-25T01:32:19.806340+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: reconciliation_uat_generation
  subject_uid: story-d111f966
---

All 13 tests pass on first run.

```
UATs generated for story story-d111f966 (plan item 6 of 9)

Story: story-d111f966
Test file(s) created:
  - tests/test_reconciliation_static_site_generator.test.ts

Tests written: 13
Tests passed: 13
Tests failed: 0

test_files_created:
  - "tests/test_reconciliation_static_site_generator.test.ts"
```

Tests cover all 13 ACs (AC443–AC455) at the boundary the AC specifies — programmatic `runGenerate` for output/contract ACs, real CLI subprocess (`node tools/generate/bin/cli.mjs`) for the two CLI ACs (443, 455). Each test uses isolated tmp dirs, exercises real components (no internal mocking), and asserts the observable behavior described in the AC.
