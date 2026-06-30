---
uid: report-7442ef93
id: REPORT-904
type: report
title: Claude reconciliation_uat_generation report
created_by: xgd
created_at: '2026-06-30T06:31:30.016594+00:00'
updated_at: '2026-06-30T06:31:30.016594+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: reconciliation_uat_generation
  subject_uid: story-bab9b773
---

All 16 tests pass. Every test name matches the enforced `^test_UAT_AC\d+_\w+$` convention, and there's exactly one UAT per acceptance criterion (AC-823 through AC-838).

## Completion Report

```
UATs generated for story story-bab9b773 (plan item 2 of 3)

Story: story-bab9b773
Test file(s) created:
  - tests/test_reconciliation_preview_generated_page.test.ts   (handler ACs, node env)
  - tests/test_reconciliation_preview_digest_card.test.ts      (chat-card ACs, jsdom env)

Tests written: 16
Tests passed: 16
Tests failed: 0

test_files_created:
  - "tests/test_reconciliation_preview_generated_page.test.ts"
  - "tests/test_reconciliation_preview_digest_card.test.ts"
```

**AC → test mapping (1:1):**

| AC | Test | What it proves |
|----|------|----------------|
| AC-838 | `test_UAT_AC838_tool_registered_trial_tier_with_self_inspection_spec` | registered system_action, trial tier, `pageId`+`compareToDigestId` schema, self-inspection description |
| AC-837 | `test_UAT_AC837_degraded_digest_renders_signal_panels_only_without_screenshot_strip` | empty screenshots → signal panels only, no strip, no error |
| AC-836 | `test_UAT_AC836_vs_inspiration_section_only_when_inspirationDelta_present` | "vs. inspiration" section present-below-strip only when delta exists |
| AC-835 | `test_UAT_AC835_card_leads_with_screenshot_strip_and_draft_page_header` | strip is first body element, one img/viewport, draft-page header |
| AC-834 | `test_UAT_AC834_missing_asset_preserves_original_src_per_asset_graceful_degradation` | missing `/assets` keeps src; mixed present/missing |
| AC-833 | `test_UAT_AC833_local_assets_are_inlined_for_hero_services_grid_and_logo` | hero/services-grid/logo inlined as data: URLs |
| AC-832 | `test_UAT_AC832_captured_inline_and_sourceUrl_is_synthetic_preview_scheme` | inline data-URL with draft headings; `preview://` sourceUrl |
| AC-831 | `test_UAT_AC831_exhausted_browser_budget_degrades_gracefully` | exhausted budget → success, no screenshots, budget note |
| AC-830 | `test_UAT_AC830_no_browser_rendering_degrades_to_structural_signals` | no BROWSER → static digest with real signals |
| AC-829 | `test_UAT_AC829_unresolvable_compareToDigestId_is_non_fatal_with_whatsMissing_note` | bad compareToDigestId → success, no delta, whatsMissing note |
| AC-828 | `test_UAT_AC828_resolving_compareToDigestId_yields_inspirationDelta_with_comparison_term` | resolving id → non-empty delta with comparison term |
| AC-827 | `test_UAT_AC827_unknown_pageId_returns_descriptive_failure_naming_known_ids` | unknown pageId → failure naming id + known ids |
| AC-826 | `test_UAT_AC826_explicit_pageId_selects_requested_page` | explicit pageId selects that page |
| AC-825 | `test_UAT_AC825_draftId_content_addressed_and_stable_across_asset_availability` | draftId deterministic, content-sensitive, asset-byte-stable |
| AC-824 | `test_UAT_AC824_previewSource_carries_account_draft_page_and_iso_capture_time` | previewSource provenance block |
| AC-823 | `test_UAT_AC823_default_page_three_viewport_screenshots_under_previews_namespace` | default page, 3 viewports under `previews/` namespace |

No runtime code, existing tests, or tickets were modified. Tests reuse the existing `_helpers_REQ-51_preview.ts` harness and match project vitest patterns (node default; `// @vitest-environment jsdom` for the card file).
