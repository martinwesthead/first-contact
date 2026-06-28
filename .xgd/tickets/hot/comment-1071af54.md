---
uid: comment-1071af54
id: COMMENT-221
type: comment
title: Claude response for reconciliation_uat_generation report
created_by: xgd
created_at: '2026-06-28T19:53:47.136669+00:00'
updated_at: '2026-06-28T19:53:47.136669+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  subject_uid: report-2618a09b
  kind: note
---

All 16 of the story's acceptance criteria now have exactly one passing UAT — a clean 1:1 mapping with the current (escalation-heuristic) code.

## Completion Report

```
UATs generated for story story-3f73931a (plan item 1 of 9)

Story: story-3f73931a — Extract a reference website's design signals into a
       canonical Reference Digest

Test file(s) created:
  - tests/test_UAT_AC597_thin_body_escalates_content_rich_stays_static.test.ts
  - tests/test_UAT_AC610_js_dominant_document_escalates.test.ts
  - tests/test_UAT_AC611_force_rendered_escalates_unconditionally.test.ts
  - tests/test_UAT_AC612_rendered_fetch_returns_hydrated_html.test.ts
  - tests/test_UAT_AC613_computed_signals_refine_digest.test.ts
  - tests/test_UAT_AC614_screenshots_upload_under_eight_mb_cap.test.ts

Test file(s) deleted (stale, see note):
  - tests/test_UAT_AC597_escalation_never_triggers_static_path.test.ts

Tests written: 6 (one new UAT per AC for the 6 ACs lacking a correct test)
Tests passed: 6
Tests failed: 0

Full-story verification (all 16 ACs): 16 test files, 16 passed, 0 failed.

test_files_created:
  - "tests/test_UAT_AC597_thin_body_escalates_content_rich_stays_static.test.ts"
  - "tests/test_UAT_AC610_js_dominant_document_escalates.test.ts"
  - "tests/test_UAT_AC611_force_rendered_escalates_unconditionally.test.ts"
  - "tests/test_UAT_AC612_rendered_fetch_returns_hydrated_html.test.ts"
  - "tests/test_UAT_AC613_computed_signals_refine_digest.test.ts"
  - "tests/test_UAT_AC614_screenshots_upload_under_eight_mb_cap.test.ts"
```

### Why only 6 new tests (not 16)

This story is an **upgrade** (REQ-22 extending REQ-21). The prior reconcile already committed correct, passing UATs for **AC-587 through AC-596** (palette, typography, layout, asset-inventory, dedup, content, absent-signals, schema-validator, markdown, what's-missing). I verified all ten still pass against current code and left them untouched — recreating them would have produced duplicate AC→test mappings, which the prompt prohibits ("no extras"). The genuine gap was the **6 ACs with no correct test**: the new REQ-22 rendered-path ACs (610–614) plus AC-597.

### Note on the one deletion (AC-597)

`test_UAT_AC597_escalation_never_triggers_static_path.test.ts` (from the prior bundle) encodes the **render-by-default** spec — it calls `shouldEscalateToRendered(digest)` expecting a boolean `false` for every page. The current code (and the authoritative current AC-597, `b12d81c8`) is the **escalation-heuristic** version: `shouldEscalateToRendered({html})` → `{escalate, reason}`, escalating on `thin_body`. The story's reconciliation note is explicit that the heuristic version is ground truth and the render-by-default amendment belongs to REQ-49, **not** this bundle.

That old test therefore **fails against current code** and directly contradicts the current AC. Per the reconciliation rule "test is wrong → rewrite the test" — and because the obsolete behavior is baked into the file's name — the correct action was to replace it: delete the stale file and add `test_UAT_AC597_thin_body_escalates_content_rich_stays_static`. Leaving it would have broken both the "tests must pass" gate and the 1:1 AC→test mapping.

### Boundary / mocking notes
- Escalation, merge, and upload tests run against the **real** extractor functions at the package boundary (`shouldEscalateToRendered`, `extractSignals` + `mergeComputedSignals`, `uploadScreenshots`) with only the R2 bucket faked via the project's `makeMemR2` helper.
- AC-612 injects a deterministic fake `BrowserDriver` into `renderedFetch` — no real browser is launched, matching the AC.
- No runtime/production code was modified.
