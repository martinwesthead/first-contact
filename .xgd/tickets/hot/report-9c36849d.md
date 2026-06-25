---
uid: report-9c36849d
id: REPORT-505
type: report
title: Claude reconciliation_uat_generation report
created_by: xgd
created_at: '2026-06-25T01:55:32.910128+00:00'
updated_at: '2026-06-25T01:55:32.910128+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: reconciliation_uat_generation
  subject_uid: story-37572647
---

All 13 tests pass.

```
UATs generated for story story-37572647 (plan item 8 of 9)

Story: story-37572647
Test file(s) created:
  - tests/test_UAT_AC464_leads_table_created_by_migration.test.ts
  - tests/test_UAT_AC465_post_persists_lead_and_returns_lead_id.test.ts
  - tests/test_UAT_AC466_honeypot_returns_success_no_row.test.ts
  - tests/test_UAT_AC467_non_json_content_type_rejected.test.ts
  - tests/test_UAT_AC468_malformed_json_rejected.test.ts
  - tests/test_UAT_AC469_missing_email_rejected.test.ts
  - tests/test_UAT_AC470_malformed_email_rejected.test.ts
  - tests/test_UAT_AC471_turnstile_failure_rejected.test.ts
  - tests/test_UAT_AC472_ip_country_from_cf_header.test.ts
  - tests/test_UAT_AC473_non_canonical_fields_in_extra_fields.test.ts
  - tests/test_UAT_AC474_resend_failure_does_not_fail_request.test.ts
  - tests/test_UAT_AC475_generator_emits_turnstile_when_form_and_key_present.test.ts
  - tests/test_UAT_AC476_island_attaches_turnstile_token.test.ts

Tests written: 13
Tests passed: 13
Tests failed: 0

test_files_created:
  - "tests/test_UAT_AC464_leads_table_created_by_migration.test.ts"
  - "tests/test_UAT_AC465_post_persists_lead_and_returns_lead_id.test.ts"
  - "tests/test_UAT_AC466_honeypot_returns_success_no_row.test.ts"
  - "tests/test_UAT_AC467_non_json_content_type_rejected.test.ts"
  - "tests/test_UAT_AC468_malformed_json_rejected.test.ts"
  - "tests/test_UAT_AC469_missing_email_rejected.test.ts"
  - "tests/test_UAT_AC470_malformed_email_rejected.test.ts"
  - "tests/test_UAT_AC471_turnstile_failure_rejected.test.ts"
  - "tests/test_UAT_AC472_ip_country_from_cf_header.test.ts"
  - "tests/test_UAT_AC473_non_canonical_fields_in_extra_fields.test.ts"
  - "tests/test_UAT_AC474_resend_failure_does_not_fail_request.test.ts"
  - "tests/test_UAT_AC475_generator_emits_turnstile_when_form_and_key_present.test.ts"
  - "tests/test_UAT_AC476_island_attaches_turnstile_token.test.ts"
```
