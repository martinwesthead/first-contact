---
uid: report-1903c56a
id: REPORT-677
type: report
title: Claude reconciliation_uat_generation report
created_by: xgd
created_at: '2026-06-28T20:25:33.851220+00:00'
updated_at: '2026-06-28T20:25:33.851220+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: reconciliation_uat_generation
  subject_uid: story-b3866352
---

All 12 AC UATs pass. No runtime code or existing tests were modified — only new files created.

```
UATs generated for story story-b3866352 (plan item 3 of 9)

Story: story-b3866352  (Convert an existing website into an editable draft)
Test file(s) created:
  - tests/test_UAT_AC623_first_convert_requests_confirmation.test.ts
  - tests/test_UAT_AC624_consent_then_mechanical_summary.test.ts
  - tests/test_UAT_AC625_confirmation_is_per_url.test.ts
  - tests/test_UAT_AC626_ownership_registers_robots_override.test.ts
  - tests/test_UAT_AC627_invalid_url_fails_no_consent.test.ts
  - tests/test_UAT_AC628_never_analyzed_url_digest_not_found.test.ts
  - tests/test_UAT_AC629_streams_ordered_progress.test.ts
  - tests/test_UAT_AC630_persists_digest_matching_summary.test.ts
  - tests/test_UAT_AC631_system_prompt_includes_howto.test.ts
  - tests/test_UAT_AC632_purely_mechanical_no_fallback.test.ts
  - tests/test_UAT_AC633_single_page_conversion_draft.test.ts
  - tests/test_UAT_AC634_multi_page_conversion_draft.test.ts

Tests written: 12  (one UAT per AC, 1:1 mapping AC-623 … AC-634)
Tests passed: 12
Tests failed: 0

test_files_created:
  - "tests/test_UAT_AC623_first_convert_requests_confirmation.test.ts"
  - "tests/test_UAT_AC624_consent_then_mechanical_summary.test.ts"
  - "tests/test_UAT_AC625_confirmation_is_per_url.test.ts"
  - "tests/test_UAT_AC626_ownership_registers_robots_override.test.ts"
  - "tests/test_UAT_AC627_invalid_url_fails_no_consent.test.ts"
  - "tests/test_UAT_AC628_never_analyzed_url_digest_not_found.test.ts"
  - "tests/test_UAT_AC629_streams_ordered_progress.test.ts"
  - "tests/test_UAT_AC630_persists_digest_matching_summary.test.ts"
  - "tests/test_UAT_AC631_system_prompt_includes_howto.test.ts"
  - "tests/test_UAT_AC632_purely_mechanical_no_fallback.test.ts"
  - "tests/test_UAT_AC633_single_page_conversion_draft.test.ts"
  - "tests/test_UAT_AC634_multi_page_conversion_draft.test.ts"
```

**Notes for the reconcile orchestration:**

- **Boundary chosen.** Confirmation/convert ACs (623–630, 632) drive the real `confirmConvertHandler`/`transcribeSiteHandler` action handlers through the `makeTranscribeHarness` (real in-memory KV + R2; only the network `fetch`/Anthropic boundary is stubbed). The how-to AC (631) and the two e2e ACs (633/634) drive the real `handleChatRequest` Worker entry point with a scripted (mocked) chat loop, matching the existing FC demo pattern.
- **AC-633/634 "resulting draft".** `handleChatRequest` does not return the mutated site, so the draft is reconstructed by replaying the AI's successful state-edit tool calls through the real `applyToolCall` — the same production transform the handler uses internally. Assertions then check pages, theme-token divergence from defaults, the `/assets/sites/{siteId}/imports/…` R2 image key (and that the source URL is *not* used), and source text presence.
- **AC-632 is `regression_only`** in the matrix; it is still written as a UAT (asserts mechanical-only payloads across success/edge inputs plus a static check that no legacy synthesis branch exists in `transcribe-site.ts`).
- All `it()` titles conform to `^test_UAT_AC\d+_\w+$`. No tickets were modified and nothing was committed — those are the outer reconcile workflow's responsibility.
