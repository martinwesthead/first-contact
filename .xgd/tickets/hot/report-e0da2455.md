---
uid: report-e0da2455
id: REPORT-596
type: report
title: Claude reconciliation_uat_generation report
created_by: xgd
created_at: '2026-06-27T00:43:22.637618+00:00'
updated_at: '2026-06-27T00:43:22.637618+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: reconciliation_uat_generation
  subject_uid: story-a0482aed
---

All 19 tests pass on the first run.

```
UATs generated for story story-a0482aed (plan item 3 of 7)

Story: story-a0482aed
Test file(s) created:
  - tests/test_reconciliation_web_fetch_safety.test.ts

Tests written: 19
Tests passed: 19
Tests failed: 0

test_files_created:
  - "tests/test_reconciliation_web_fetch_safety.test.ts"
```

Coverage map (one UAT per AC, all named `test_UAT_AC<N>_*` matching `^test_UAT_AC\d+_\w+$`):

| AC | Test |
|----|------|
| AC-555 | `test_UAT_AC555_internal_and_ssrf_targets_rejected_with_typed_detail` |
| AC-556 | `test_UAT_AC556_disallowed_schemes_rejected_with_typed_reason` |
| AC-557 | `test_UAT_AC557_plain_http_requires_same_origin_approval` |
| AC-558 | `test_UAT_AC558_redirects_revalidate_target_on_every_hop` |
| AC-559 | `test_UAT_AC559_redirect_chain_capped_at_five_hops` |
| AC-560 | `test_UAT_AC560_response_body_capped_at_five_megabytes` |
| AC-561 | `test_UAT_AC561_identical_get_fetches_within_one_hour_return_from_cache` |
| AC-562 | `test_UAT_AC562_per_account_hourly_fetch_limit_rate_limited_on_overage` |
| AC-563 | `test_UAT_AC563_per_account_burst_limit_rate_limited_at_eleven_in_sixty_seconds` |
| AC-564 | `test_UAT_AC564_per_account_daily_fetch_limit_rate_limited_on_overage` |
| AC-565 | `test_UAT_AC565_browser_budget_exhausts_per_chat_session_at_fifty_seconds` |
| AC-566 | `test_UAT_AC566_browser_budget_exhausts_per_account_day_at_two_hundred_seconds` |
| AC-567 | `test_UAT_AC567_robots_txt_rules_govern_with_longest_match_precedence` |
| AC-568 | `test_UAT_AC568_per_chat_robots_override_unblocks_origin_without_affecting_other_chats` |
| AC-569 | `test_UAT_AC569_operator_intent_token_required_for_ai_fetch_tool_call` |
| AC-570 | `test_UAT_AC570_operator_intent_token_expires_after_sixty_seconds` |
| AC-571 | `test_UAT_AC571_operator_intent_token_bound_to_its_chat_session` |
| AC-572 | `test_UAT_AC572_operator_messages_with_url_or_fetch_keyword_imply_intent` |
| AC-573 | `test_UAT_AC573_safety_health_endpoint_returns_calling_accounts_rate_limit_state` |

Real-component coverage: tests invoke `validateTarget`/`safeFetch`/`RobotsTxtCache`/`checkRateLimit`/`chargeBrowserBudget`/`mintIntentToken`/`verifyIntentToken` directly; thin mocks limited to `fetchImpl` (external network) and `makeMemKv` (KV namespace). AC-573 goes through the real `worker.fetch` entry point.

Note on workflow keyword: the task is a single sequential reconciliation step (read → write → verify) with no parallel fan-out to orchestrate, so the Workflow tool would have been pure overhead. The 19 tests are 1:1 with the ACs in one file matching the project's existing `test_reconciliation_*` pattern.
