---
uid: request-dc524eaa
id: REQ-7
type: request
title: 'Lead-capture pipeline: D1 leads schema + Turnstile + Resend on public-site
  form handler'
created_by: xgd
created_at: '2026-06-12T23:06:59.334571+00:00'
updated_at: '2026-06-13T19:09:33.669926+00:00'
completed_at: null
last_field_updated: status
status: free_coded
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
  story_points: 3
  commits:
  - fa4194443ca762e1c2782de4e281ffcb3e29a910
---

## Scope

Replace the stub `/api/forms/contact` endpoint on `apps/public-site` with the real lead-capture pipeline: D1 leads schema, Cloudflare Turnstile verification, Resend email notification. After this REQ the 1st Contact contact form captures real leads end-to-end on `1stcontact.io`.

This is also the first D1 work in the codebase — establishes the migration pattern under `db/migrations/` and the D1 binding pattern in a Worker.

Design discussion: see [[DOC-5]] (Platform Architecture) on lead/contact data + magic links; [[DOC-7]] (Framework Architecture) §9.3 on the public-site Worker as the home for public-facing endpoints.

## Why free-coded

Single cohesive feature: data plus side-effects plus configuration. The lead schema is small and well-specified; the form-handler logic is procedural; the Resend integration is direct. No algorithmic design — execution.

## Deliverables

### D1 schema

`db/migrations/0001_create_leads.sql`:

```sql
CREATE TABLE leads (
  id              TEXT PRIMARY KEY,            -- ulid or uuid
  site_id         TEXT NOT NULL,                -- '1stcontact' for now; per-site later
  form_id         TEXT NOT NULL,                -- 'contact' for now; multiple forms per site later
  created_at      INTEGER NOT NULL,             -- unix ms
  name            TEXT,
  email           TEXT NOT NULL,
  phone           TEXT,
  message         TEXT,
  extra_fields    TEXT,                          -- JSON blob for non-canonical fields
  page_path       TEXT,                          -- where the form was submitted from
  user_agent      TEXT,
  ip_country      TEXT,                          -- from CF-IPCountry
  turnstile_pass  INTEGER NOT NULL DEFAULT 0,    -- 0/1
  status          TEXT NOT NULL DEFAULT 'new',   -- new | contacted | quote_needed | quote_sent | follow_up | booked | lost | archived
  notes           TEXT
);

CREATE INDEX leads_site_created ON leads (site_id, created_at DESC);
CREATE INDEX leads_status ON leads (site_id, status);
```

Status enum matches the CRM Lite lifecycle in [[DOC-4]] (§3 CRM Lite) and [[DOC-5]] (CRM Lite Architecture). The schema deliberately includes columns the CRM Lite UI will need so we're not migrating again immediately.

Migration applied via `wrangler d1 migrations apply` against a D1 database named `1stcontact-prod` (created out-of-band; ID recorded in `wrangler.toml`).

### `apps/public-site` updates

- `apps/public-site/wrangler.toml`:
  - Add `[[d1_databases]]` binding `LEADS_DB` to the production database.
  - Add `[vars]` for non-secret config: `TURNSTILE_SITE_KEY`, `RESEND_NOTIFY_TO`, `RESEND_NOTIFY_FROM`, `SITE_ID="1stcontact"`.
  - Secrets (set via `wrangler secret put`): `TURNSTILE_SECRET`, `RESEND_API_KEY`.
- `apps/public-site/src/forms.ts` — real handler:
  1. Parse + content-type validate JSON.
  2. Honeypot check (drops silently).
  3. Field validation: `email` required + RFC-shaped; required custom fields per form config.
  4. Turnstile token verify via `https://challenges.cloudflare.com/turnstile/v0/siteverify` with `TURNSTILE_SECRET`. On failure: 400, no DB write.
  5. Generate ULID. Read `CF-IPCountry` header for `ip_country`.
  6. INSERT into `leads`.
  7. Resend POST to `https://api.resend.com/emails`: from `RESEND_NOTIFY_FROM`, to `RESEND_NOTIFY_TO`, subject "New lead: {name} <{email}>", body containing lead fields + lead UUID. Failure is logged but does NOT fail the request — the lead is already persisted.
  8. Return `200 {success: true, message: "Thanks — we'll be in touch.", lead_id}`.

Errors return JSON `{success: false, error: <code>, message: <string>}`. Codes: `INVALID_JSON`, `INVALID_CONTENT_TYPE`, `MISSING_FIELD`, `INVALID_EMAIL`, `TURNSTILE_FAILED`, `INTERNAL`.

### Turnstile widget loading

- `packages/framework/src/modules/contact-form/index.astro` — load the Turnstile script (`https://challenges.cloudflare.com/turnstile/v0/api.js`) when the module is present on a page; the existing `data-turnstile-target` element from REQ-5 becomes the widget mount; widget configured with the site's `TURNSTILE_SITE_KEY` (exposed via build-time inlining or a `<meta>` tag — decision in the implementation).
- Client island intercepts submit, retrieves the Turnstile token, includes it in the JSON POST as `turnstile_token`.

### Email notification template

A minimal HTML body (no marketing chrome) — branded with 1st Contact wordmark, lead fields tabulated, "Open in dashboard" link placeholder (real link wired when the control-app's lead view exists in a later REQ).

### Out-of-band operator tasks (documented in ticket)

- `wrangler d1 create 1stcontact-prod` and record the database id in `wrangler.toml`.
- `wrangler d1 migrations apply 1stcontact-prod --remote` to apply `0001_create_leads.sql`.
- Set up Turnstile site in Cloudflare dashboard for `1stcontact.io`; capture site key + secret.
- Set up Resend account, verify sending domain, capture API key.
- `wrangler secret put TURNSTILE_SECRET`
- `wrangler secret put RESEND_API_KEY`

## Explicitly NOT in this ticket

- CRM Lite UI to view/manage leads — control-app concern, later REQ. Status changes in this REQ default to `new`; no transitions.
- Lead deduplication (same email submitting twice). Future.
- Auto-reply email to the lead. Future.
- Multi-site lead routing — `site_id` hardcoded to `1stcontact` in this REQ; per-site routing comes with customer site support.
- Magic-link "manage this inquiry" follow-up per DOC-5 — future.
- Webhook / Slack notification. Future.
- Lead export / deletion APIs. Future (privacy work in DOC-5).

## Test approach (UATs)

Runner: vitest with `wrangler.unstable_dev`. D1 binding uses the local sqlite emulator. Resend and Turnstile calls mocked via fetch stubs.

- `test_UAT_FC_REQ-7_migration_creates_leads_table_with_expected_columns` — apply migration to a fresh local D1, query `pragma table_info(leads)`, assert column set + types + NOT NULLs + indexes.
- `test_UAT_FC_REQ-7_post_inserts_lead_with_all_canonical_fields` — happy-path POST with valid Turnstile, mocked Resend, asserts row in D1 with expected values.
- `test_UAT_FC_REQ-7_post_returns_lead_id_in_response`
- `test_UAT_FC_REQ-7_post_writes_ip_country_from_cf_header`
- `test_UAT_FC_REQ-7_post_persists_lead_when_resend_call_fails` — Resend mock returns 500, assert 200 to client, assert row in D1, assert logged error.
- `test_UAT_FC_REQ-7_post_rejects_invalid_content_type` — 400, INVALID_CONTENT_TYPE.
- `test_UAT_FC_REQ-7_post_rejects_malformed_json` — 400, INVALID_JSON.
- `test_UAT_FC_REQ-7_post_rejects_missing_email` — 400, MISSING_FIELD, no DB write.
- `test_UAT_FC_REQ-7_post_rejects_invalid_email` — 400, INVALID_EMAIL.
- `test_UAT_FC_REQ-7_post_rejects_failed_turnstile` — Turnstile mock returns `{success:false}`, 400 TURNSTILE_FAILED, no DB write, no Resend call.
- `test_UAT_FC_REQ-7_post_drops_honeypot_submission_silently` — honeypot filled: returns 200 success body but no DB row and no Resend call.
- `test_UAT_FC_REQ-7_post_handles_non_canonical_fields_via_extra_fields_json` — submission includes `business_name` (not a column), stored in `extra_fields` JSON.
- `test_UAT_FC_REQ-7_contact_form_island_attaches_turnstile_token_on_submit` — JSDOM, mock Turnstile global, assert posted JSON includes `turnstile_token`.

## Dependencies / follow-up tickets

- **Depends on**: REQ-3 (site-schema), REQ-4 (framework chrome), REQ-5 (contact-form module with Turnstile mount + honeypot), REQ-6 (`public-site` with stub endpoint to replace).
- **Unblocks**:
  - CRM Lite UI on the control-app (later REQ) — `leads` table is now populated.
  - Customer-site form handling — needs per-site routing on top of the same handler shape.
- **Operator prerequisites** (before deploy):
  - D1 database created and id recorded.
  - Migration applied.
  - Turnstile + Resend accounts set up; secrets pushed.