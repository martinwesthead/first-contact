---
uid: report-49ffae0e
id: REPORT-655
type: report
title: 'Capability-Intent Alignment: Lead Capture & CRM Lite (level=uat)'
created_by: xgd
created_at: '2026-06-28T19:33:14.285288+00:00'
updated_at: '2026-06-28T19:33:14.285288+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: capability_validation
  subject_uid: capability-79556c4b
  level: uat
  violations: 0
  warnings: 1
  needs_review_count: 0
---

# Capability-Intent Alignment: Lead Capture & CRM Lite
# Level: uat

**Result**: PASS
**Violations**: 0
**Warnings**: 1
**Needs review**: 0

## Cumulative Intent Considered

The capability (CAP-37 / capability-79556c4b) carries a single feature story,
STORY-45 (story-37572647, story_kind=feature, status=reconciling), whose
`intent_uid` is the reconciled bundle below. REQ-7 is the lead-capture
constituent of that bundle (test helpers and originals are named `_REQ-7_`).

| Intent ID | Status | When | Asked / changed | Counts? |
|---|---|---|---|---|
| bundle-94e1d1b6 (incl. REQ-7) | free_and_reconciled | merged @ 8ebe122e | Lead-capture pipeline: `leads` schema (migration 0001), `POST /api/forms/contact` handler, honeypot drop, content-type/JSON/email validation, Turnstile verification, CF-IPCountry capture, extra_fields JSON, best-effort Resend notification, generator Turnstile injection, client-island token attachment | YES |

At `uat` level the AC bodies are the working reference; the intent ledger was
consulted only to confirm the AC set matches the bundle's stated in-scope
surface (it does) and that out-of-scope items (CRM Lite UI, dedup, auto-reply,
multi-site routing) correctly have no ACs/UATs.

## Alignment Ledger

Each active AC under STORY-45 maps to exactly one substantive matrix UAT.
All UATs use real components (real D1/migration, real `handleContactSubmission`,
real `runGenerate`, real `enhanceContactForm` under jsdom) and thin-mock only
external boundaries (Turnstile `siteverify`, Resend `/emails`).

| AC | Matrix UAT | Outcome |
|---|---|---|
| AC-464 (leads schema + indexes) | test_UAT_AC464_leads_table_created_by_migration | aligned — applies migration 0001 to fresh DB, asserts column set/types/NOT NULL/defaults + both indexes |
| AC-465 (valid POST persists + lead_id) | test_UAT_AC465_post_persists_lead_and_returns_lead_id | aligned — 200, success/message/lead_id, row columns incl. status='new' |
| AC-466 (honeypot silent drop) | test_UAT_AC466_honeypot_returns_success_no_row | aligned — 200 success, no row, no Resend call |
| AC-467 (bad content-type) | test_UAT_AC467_non_json_content_type_rejected | aligned — text/plain + form-encoded → 400 INVALID_CONTENT_TYPE, no row, no Resend |
| AC-468 (malformed JSON) | test_UAT_AC468_malformed_json_rejected | aligned — garbage + JSON array → 400 INVALID_JSON, no row |
| AC-469 (missing email) | test_UAT_AC469_missing_email_rejected | aligned — absent/empty/whitespace → 400 MISSING_FIELD, no row, no Resend |
| AC-470 (invalid email) | test_UAT_AC470_malformed_email_rejected | aligned — no-@/no-domain/internal-space → 400 INVALID_EMAIL, no row, no Resend |
| AC-471 (turnstile fail) | test_UAT_AC471_turnstile_failure_rejected | aligned — siteverify false + missing token → 400 TURNSTILE_FAILED, no row, no Resend |
| AC-472 (ip_country) | test_UAT_AC472_ip_country_from_cf_header | aligned — with CF-IPCountry=GB persisted; without header persisted null |
| AC-473 (extra_fields) | test_UAT_AC473_non_canonical_fields_in_extra_fields | aligned — non-canonical → exact JSON object; canonical-only → null |
| AC-474 (resend failure best-effort) | test_UAT_AC474_resend_failure_does_not_fail_request | aligned — 500 + thrown network error both still 200 + row persisted |
| AC-475 (generator turnstile) | test_UAT_AC475_generator_emits_turnstile_when_form_and_key_present | aligned — form+key emits script+meta; form+no-key and no-form+key emit neither |
| AC-476 (island attaches token) | test_UAT_AC476_island_attaches_turnstile_token | aligned — widget present → turnstile_token attached; absent → key omitted |

## Findings

| # | Severity | Property | Element | Resolution category | Issue | Suggested edit |
|---|---|---|---|---|---|---|
| 1 | warning | exclusivity | test_UAT_FC_REQ-7_* (14 files) vs test_UAT_AC464–476 | (test-cleanup) | The pre-reconciliation free-coded UATs `test_UAT_FC_REQ-7_*` (e.g. `migration_creates_leads_table_with_expected_columns`, `post_inserts_lead_with_all_canonical_fields`, `post_drops_honeypot_submission_silently`, `post_rejects_*`, `post_writes_ip_country_from_cf_header`, `post_handles_non_canonical_fields_via_extra_fields_json`, `post_persists_lead_when_resend_call_fails`, `generator_emits_turnstile_script_when_contact_form_present`, `contact_form_island_attaches_turnstile_token_on_submit`, `post_returns_lead_id_in_response`) verify the same scenarios in the same shape as the AC-named matrix UATs, sharing the identical `_helpers_REQ-7_handler` / `_helpers_REQ-7_db` harness. They are superseded originals, not a different test shape. | Delete the `test_UAT_FC_REQ-7_*` originals now that AC-464–476 are the matrix UATs (orphaned-file cleanup per coding standards). Does not affect pass/fail. |

## Notes for the Editor

- **No violations and no needs_review** — the uat-level matrix is fully aligned
  to cumulative intent. Every active AC (464–476) has exactly one substantive,
  real-component UAT, and each UAT exercises precisely the behavior its AC
  claims, including the multi-variant cases each AC's Verification section calls
  for. This level PASSES.
- The only action is hygiene: the legacy `test_UAT_FC_REQ-7_*` suite duplicates
  the matrix UATs one-for-one in the same shape and should be removed. This is a
  warning, not a gate — the duplication does not weaken evidence or alignment.
- Minor, intentional, and non-blocking: AC-464's `status` enum is documentary
  (no CHECK constraint asserted) — its Verification only requires column
  set/types/NOT NULL/defaults/indexes, which the test asserts in full. AC-465's
  "email trimmed" and the "missing content-type entirely" / "JSON primitive"
  sub-variants are not separately exercised, but each AC's Verification is
  satisfied by the variants present; none rise to a coverage gap.
