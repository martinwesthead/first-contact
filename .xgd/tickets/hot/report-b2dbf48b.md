---
uid: report-b2dbf48b
id: REPORT-523
type: report
title: 'Report: fix_plan for report-57a8f0a6'
created_by: xgd
created_at: '2026-06-25T02:21:56.077833+00:00'
updated_at: '2026-06-25T02:24:26.295282+00:00'
completed_at: null
last_field_updated: batches_pending
result: pass
fields:
  report_kind: fix_plan
  subject_uid: report-57a8f0a6
  items:
  - index: 0
    tests:
    - project.min_coverage
    dependency_tests: []
    hypothesis: '.xgd/quality.yaml has source_dirs: [] so the vitest V8 coverage instrument
      loads no source files, reports coverage=0.0, and trips the 25% min_coverage_percent
      gate in quality_config_validation'
    instructions: 'Coverage validation fails because the vitest plugin instruments
      zero source files: .xgd/quality.yaml declares source_dirs: [], the project has
      no top-level src/ for the plugin''s fallback, and the monorepo''s actual source
      code lives under per-package src/ directories. Populate source_dirs in .xgd/quality.yaml
      with the existing source directories of this monorepo: apps/control-app/src,
      apps/public-site/src, packages/builder-ui/src, packages/framework/src, packages/site-schema/src,
      tools/generate/src. (packages/ui-kit and sites/1stcontact have no src/.) Then
      run `xgd quality run` to confirm lines_total > 0, files_covered is non-empty,
      and the project.min_coverage validator no longer fires. If the measured coverage
      after this config fix is still below 25%, that is a real coverage gap (not a
      config gap) and the appropriate response is to add UATs against under-covered
      ACs — not to relax the threshold, skip the test, or shrink source_dirs to inflate
      the percentage. Do NOT touch .xgd/config.yaml''s min_coverage_percent. Do NOT
      run `xgd quality apply` afterwards — it will regenerate source_dirs back to
      [] (the plugin''s propose_config() does not auto-detect monorepo per-package
      src layouts; this is the same regression class that produced the empty value
      in the first place at commit 2da52f47).'
    test_scope: project.min_coverage
  fix_iteration: 3
  batches_pending: false
---

# Fix Plan — Iteration 3

## Hypothesis
`.xgd/quality.yaml` has `source_dirs: []`, so the vitest V8 coverage instrument loads no files (`lines_total=0`, `files_covered=[]`), reports `coverage=0.0`, and the quality_config validator fails the 25% minimum — the failure is a configuration gap, not a test or code defect.

## Analysis

**Failure**: One config_error issue from `quality_config_validation`:
`project.min_coverage — Coverage 0.0% below minimum 25.0%`.

**Suite outcome (REPORT-522 quality report)**: `javascript-vitest` suite is `success` (104 passed, 0 failed, 127 deselected) but with `coverage=0.0, lines_covered=0, lines_total=0, files_covered=[]`. The 0.0% is not a coverage *measurement* of zero — it's the plugin instrumenting *zero source files* because `source_dirs: []` in `.xgd/quality.yaml`.

**Plugin behaviour** (`ai/gendevlabs/javascript_vitest_open/plugin.py:881`):
```
_coverage_sources():
  configured = self._configured_source_dirs()
  if configured: return configured
  if (project_root / "src").is_dir(): return ["src"]   # not the case here
  return []                                            # ← this path
```
With an empty result, `measure_coverage()` emits no `--coverage.include=<dir>/**` flags, so V8 instruments nothing.

**Repo layout** (monorepo, no top-level `src/`):
- `apps/control-app/src`
- `apps/public-site/src`
- `packages/builder-ui/src`
- `packages/framework/src`
- `packages/site-schema/src`
- `tools/generate/src`

(`packages/ui-kit` and `sites/1stcontact` have no `src/`.)

**Validator** (`xgd_source/quality/quality_validator.py:729`): emits the `project.min_coverage` error when `coverage is not None AND tests_run > 0 AND coverage < min_coverage`. All three conditions hold (104 tests ran, coverage reported as 0.0, minimum is 25.0 from `.xgd/config.yaml`), so the issue is deterministic until `source_dirs` is populated.

**Iteration history (anti-repetition check)**:
- Iter 1 hypothesis: plugin schema mismatch — `per_test_timeout` field name. **Fixed** (renamed to `per_test_timeout_seconds`).
- Iter 2: empty batch (stale `javascript-vitest: plugin_error` filter from iter-1's plan no longer matched). No-op.
- Iter 3 (this): coverage-config gap that was masked by the iter-1 plugin error.

This hypothesis is NEW — different field, different validator path. The plugin error in iter-1 short-circuited the suite before coverage was ever evaluated; the coverage issue only surfaces once tests actually run.

**Isolation analysis**: N/A — this is a config-validation failure, not a flaky/order-sensitive test. No cross-suite contamination concern.

**Git history**: `source_dirs` was previously populated with `apps/control-app/src` and `apps/public-site/src` (see `git log -p .xgd/quality.yaml`). A subsequent `xgd quality apply` regenerated the file from `propose_config()`, which emits `source_dirs: []` because it does not auto-detect monorepo per-package src layouts.

## Spec Changes Made
None. This is a configuration fix; no AC, story, or test contract changes are warranted.

## Weak Evidence Flags (preventative — best effort)
None observed. The investigation was config/plugin-scoped and did not require reading individual test bodies.

## Batches

One batch — a single config edit. The failure cluster is one issue (`project.min_coverage`); no contradictions to coordinate across batches; nothing else interacts with this edit.