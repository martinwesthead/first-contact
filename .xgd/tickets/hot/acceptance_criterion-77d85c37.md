---
uid: acceptance_criterion-77d85c37
id: AC-464
type: acceptance_criterion
title: leads table is created by migration 0001 with the CRM Lite schema and indexes
created_by: xgd
created_at: '2026-06-25T01:46:55.043019+00:00'
updated_at: '2026-06-25T01:46:55.043019+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-37572647
  kind: behavior
  regression_only: false
---

## Criterion

After applying migration `0001_create_leads.sql` to a fresh D1 database, the `leads` table exists with:

- An opaque text primary key column `id`.
- Required text columns `site_id` and `form_id`.
- A required integer column `created_at` (unix milliseconds).
- Optional text columns `name`, `phone`, `message`, `page_path`, `user_agent`, `ip_country`, `notes`.
- A required `email` text column (NOT NULL).
- An `extra_fields` text column for arbitrary non-canonical fields (intended for JSON storage).
- An integer `turnstile_pass` column that is NOT NULL with default `0`.
- A text `status` column that is NOT NULL with default `'new'` and represents the CRM Lite lifecycle (the allowed values being `new`, `contacted`, `quote_needed`, `quote_sent`, `follow_up`, `booked`, `lost`, `archived`).

The migration also creates two indexes:
- `leads_site_created` over `(site_id, created_at DESC)`.
- `leads_status` over `(site_id, status)`.

## Verification

A test harness applies the migration to a freshly-created local D1 (or sqlite-compatible) database and queries `pragma table_info(leads)` and `pragma index_list(leads)` (or equivalent), asserting the column set, types, NOT NULL flags, default values, and index definitions match the criterion above.
