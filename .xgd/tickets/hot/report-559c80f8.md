---
uid: report-559c80f8
id: REPORT-900
type: report
title: Claude reconciliation_uat_generation report
created_by: xgd
created_at: '2026-06-30T06:19:50.398175+00:00'
updated_at: '2026-06-30T06:19:50.398175+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: reconciliation_uat_generation
  subject_uid: STORY-56
---

All four test names conform to the mandated `^test_UAT_AC\d+_\w+$` pattern, and all four pass against the existing render-by-default code.

```
UATs generated for story STORY-56 (plan item 1 of 3)

Story: STORY-56 (story-15bae45e) — Analyze a reference URL into an interactive Digest Report
Test file(s) created:
  - tests/test_reconciliation_analyze_page_render_by_default.test.ts

Tests written: 4
Tests passed: 4
Tests failed: 0

test_files_created:
  - "tests/test_reconciliation_analyze_page_render_by_default.test.ts"
```

**AC → UAT mapping** (the render-by-default cluster, the scope of this plan item):

| AC | UAT | Asserts |
|----|-----|---------|
| AC-617 | `test_UAT_AC617_renders_by_default_with_screenshots_and_computed_typography` | Plain `{url}` (no `forceRendered`, no heuristic) → `fetchPath: "rendered"`, computed `Inter, system-ui` typography wins over static, all three `/{viewport}.png` keys |
| AC-618 | `test_UAT_AC618_budget_exhaustion_degrades_to_static_without_failing` | Budget seeded to `DEFAULT_BROWSER_BUDGET.sessionMaxSeconds` → `status: ok`, `fetchPath: "static"`, `whatsMissing` cites exhausted budget |
| AC-622 | `test_UAT_AC622_end_to_end_spa_render_by_default_card_with_screenshots_and_background` | JS-SPA → rendered digest + card with 3 screenshot figures and a computed-only hero `background` thumbnail |
| AC-822 (new) | `test_UAT_AC822_static_rich_page_renders_by_default` | Content-rich non-SPA page (static would have sufficed) still renders → rendered fetchPath + 3 screenshots |

**⚠️ Flag for downstream reconciliation_review / merge — stale overlapping evidence in a pre-existing file:**

The sibling file `tests/test_reconciliation_analyze_page_rendered.test.ts` (from the **prior** reconcile, bundle-24c4d23c) still carries the old conditional-escalation model for the same ACs. I could not touch it (output contract: create-new-only). It needs consolidation:

- **`test_UAT_AC618_...` in that file now FAILS** against current code (`expected 'static', got 'rendered'`) — it pre-seeds only 50s, but BUG-17 raised the default ceiling to 1e9s. My new AC-618 supersedes it.
- **`test_UAT_AC617_...` and `test_UAT_AC622_...`** in that file still pass but assert the removed `forceRendered` input and "escalates/escalation" framing that the reframed ACs explicitly contradict. My new versions supersede them.
- Its `AC-620` (multimodal commentary) and `AC-621` (screenshot strip) are unchanged by this reframe and remain valid — keep those.

Recommended review action: delete the stale `AC-617/AC-618/AC-622` entries from `test_reconciliation_analyze_page_rendered.test.ts` so the one-UAT-per-AC invariant holds (the failing AC-618 there will otherwise break the suite gate). I did not modify runtime code, existing tests, or any story/AC tickets.
