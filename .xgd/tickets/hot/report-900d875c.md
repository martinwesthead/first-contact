---
uid: report-900d875c
id: REPORT-525
type: report
title: Claude batch_fix_assessment report
created_by: xgd
created_at: '2026-06-25T02:23:56.564323+00:00'
updated_at: '2026-06-25T02:23:56.564323+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: batch_fix_assessment
  subject_uid: report-57a8f0a6
  parent_report_uid: report-b2dbf48b
  batch_index: '0'
---

Quality run passed. Coverage report shows **80.84% overall** — well above the 25% minimum. `project.min_coverage` no longer fires.

Coverage by package:
- `apps/control-app/src`: 94.20%
- `apps/public-site/src`: 85.12%
- `packages/builder-ui/src`: 46.34% (lowest, but well above 25%)
- `packages/framework/src`: 100%
- `packages/site-schema/src`: 100%
- `tools/generate/src`: 81.44%

The fix as the planner predicted:
1. Set `source_dirs` in `.xgd/quality.yaml` to the six real per-package src paths (a config gap, not a coverage gap).
2. Installed the test-specific dependency `@vitest/coverage-v8@^2.1.0` that the plugin requires to instrument those files (surfaced once the dirs were declared).

Did NOT touch `.xgd/config.yaml`, did NOT run `xgd quality apply`, did NOT relax the threshold.
