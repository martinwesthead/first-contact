---
uid: comment-0a56496b
id: COMMENT-171
type: comment
title: Claude response for fix_plan report
created_by: xgd
created_at: '2026-06-25T02:22:09.623896+00:00'
updated_at: '2026-06-25T02:22:09.623896+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  subject_uid: report-b2dbf48b
  kind: note
---

Fix plan iteration 3 created as **REPORT-523** (`report-b2dbf48b`).

**Plan**: one batch directing the builder to populate `.xgd/quality.yaml`'s `source_dirs` with the 6 actual per-package src directories (`apps/control-app/src`, `apps/public-site/src`, `packages/builder-ui/src`, `packages/framework/src`, `packages/site-schema/src`, `tools/generate/src`).

**Root cause**: the vitest plugin's `propose_config()` emitted `source_dirs: []` (a known gap for monorepo layouts — see `plugin.py:881`), so V8 coverage instrumented zero files → `coverage=0.0` → trips the 25% min_coverage_percent gate in `quality_config_validation`. Iter-1's plugin error masked this; iter-2 was an empty no-op batch. This is a new, structurally different hypothesis (different field, different validator path) — not a repeat. The instructions explicitly forbid relaxing the threshold, shrinking source_dirs to inflate %, or running `xgd quality apply` afterwards (which would regenerate `source_dirs: []` again).
