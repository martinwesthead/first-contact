---
uid: report-19fb96df
id: REPORT-581
type: report
title: Claude structural_rebalance report
created_by: xgd
created_at: '2026-06-27T00:25:07.845736+00:00'
updated_at: '2026-06-27T00:25:07.845736+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: structural_rebalance
  subject_uid: report-cda4212b
---

I have enough to complete this. 81 UAT tests exist in `./tests/`, but `.xgd/uat_index.json` is missing — that's why the health check counts 0 UATs per capability. The 8 capabilities align cleanly with 8 distinct architectural areas from the policy (Builder UI, Lead Capture & CRM Lite, Public Site Delivery, Static Site Generator, Framework Module Catalog, Theme Tokens, Site Schema, Deployment Infrastructure) and each has 1–2 stories with multiple ACs. Splits/merges cannot move UATs into existence; merging would destroy meaningful architectural boundaries.

## Rebalance Summary

```yaml
status: no_rebalance_required
previous_attempts: 0
splits: []
merges: []

diagnosis: |
  All 8 capabilities are flagged under_min with actual_count=0 and threshold=20.
  The uniformity (every capability at exactly 0) and the discovery that 81
  test_UAT_AC*.test.ts files exist on disk indicate this is an indexing
  artifact — the file .xgd/uat_index.json is absent in this worktree, so
  structural_validation.UATCountIndex returns 0 for every AC ID it queries.

  A structural rebalance cannot fix this:
    • Splits/merges only redistribute stories between capabilities; they do
      not create UATs.
    • Total system UATs as counted = 0; therefore no redistribution can
      satisfy a minimum-20-per-capability threshold.
    • The 8 capabilities cleanly partition the locked architectural surface
      (DOC-5 §2,3,9,10,17,22-25,29) with non-overlapping scope. Merging
      would destroy meaningful boundaries; splitting would create
      under-scoped fragments.

  Story-to-capability map (verified by xgd ticket get on each STORY-{38..46}):
    capability-8bfbe75a Platform Deployment Infrastructure : STORY-38
    capability-b7eebd2b Site Definition Schema             : STORY-39
    capability-c64bb7c7 Framework Theme Tokens & CSS Gen   : STORY-40
    capability-3630a42c Framework Module Catalog           : STORY-41, STORY-42
    capability-820fbc22 Static Site Generator              : STORY-43
    capability-474ee896 Public Site Delivery               : STORY-44
    capability-79556c4b Lead Capture & CRM Lite            : STORY-45
    capability-6694c60f Builder UI                         : STORY-46

remediation_required_outside_scope:
  - xgd quality rebuild-uat-index   # regenerates .xgd/uat_index.json
  - re-run structural_health_check  # should pass once index is rebuilt
  - if still under_min after rebuild, raise the issue: a 20-UAT minimum is
    not achievable for a Phase 0 project with ~10 ACs per capability area;
    per-capability overrides (fields.min_uats) or a lower global
    quality.min_uats config would be the appropriate fix
```

No ticket mutations were performed. The capability matrix is structurally healthy; the failing health check is a stale/missing-index symptom, not a balance problem the rebalance step is empowered to fix.
