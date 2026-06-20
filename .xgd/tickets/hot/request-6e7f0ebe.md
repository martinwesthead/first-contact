---
uid: request-6e7f0ebe
id: REQ-10
type: request
title: 'D1 schema: accounts, sites (draft + published), revisions, slug validation,
  1stcontact seed'
created_by: xgd
created_at: '2026-06-15T22:42:21.300689+00:00'
updated_at: '2026-06-20T19:43:57.461272+00:00'
completed_at: null
last_field_updated: status
status: free_coded
fields:
  priority: medium
  story_points: 3
  auto_merge_back: true
  needs_review: false
  commits:
  - 8ea7a829a93a5fa1918e5f692f873dbcde0be90d
  version: 0.0.15
---

## Scope

D1 schema for the multi-site, draft/published, revision-tracked data model. Accounts, sites, revisions, and the foreign-key bones to support per-account multi-site even though v1 UX exposes only the single-site path.

After this REQ: `sites` table holds one row per site with separate `draft_definition` and `published_definition` JSON columns; `revisions` table holds a snapshot per publish event; `accounts` table carries the operator identity + plan_tier needed to gate system actions. Migrations are reversible and locally testable.

Design discussion: see [[DOC-5]] (forthcoming amendment: site-definition lifecycle, accounts/sites/revisions schema) and CHAT-9 — draft/publish lifecycle leans confirmed (per-publish revisions; published is what the build renders; draft is what the builder edits).

## Why free-coded

Schema-only REQ — single cohesive intent. The shape is settled by the lifecycle decisions in CHAT-9. No algorithmic design; just translating decisions into SQL migrations + types.

## Dependencies

None. Foundational for [[REQ-11]] (API lifecycle) and [[REQ-12]] (UI lifecycle). Concurrent with [[REQ-9]] (API foundation); no ordering required between them.

## Deliverables

### D1 migrations (`db/migrations/`)

Sequential numbered migrations:

**`002_accounts.sql`**

```sql
CREATE TABLE accounts (
  id            TEXT PRIMARY KEY,           -- UUID
  email         TEXT NOT NULL UNIQUE,
  display_name  TEXT,
  plan_tier     TEXT NOT NULL DEFAULT 'trial', -- 'trial' | 'paid'
  created_at    INTEGER NOT NULL,           -- unix millis
  updated_at    INTEGER NOT NULL
);
```

**`003_sites.sql`**

```sql
CREATE TABLE sites (
  id                     TEXT PRIMARY KEY,    -- UUID
  account_id             TEXT NOT NULL REFERENCES accounts(id),
  slug                   TEXT NOT NULL UNIQUE, -- global namespace within *.1stcontact.io
  display_name           TEXT NOT NULL,
  draft_definition       TEXT NOT NULL,        -- JSON site definition (working state)
  published_definition   TEXT,                  -- JSON site definition (live), NULL if never published
  published_at           INTEGER,               -- unix millis of most recent publish
  published_revision_id  TEXT,                  -- FK to revisions.id of currently-live snapshot
  created_at             INTEGER NOT NULL,
  updated_at             INTEGER NOT NULL
);

CREATE INDEX idx_sites_account_id ON sites(account_id);
CREATE INDEX idx_sites_slug ON sites(slug);
```

**`004_revisions.sql`**

```sql
CREATE TABLE revisions (
  id              TEXT PRIMARY KEY,           -- UUID
  site_id         TEXT NOT NULL REFERENCES sites(id),
  definition      TEXT NOT NULL,              -- JSON snapshot of the published definition
  published_at    INTEGER NOT NULL,
  published_by    TEXT,                       -- account_id of the publisher
  description     TEXT,                       -- optional operator-supplied note
  created_at      INTEGER NOT NULL
);

CREATE INDEX idx_revisions_site_id ON revisions(site_id);
CREATE INDEX idx_revisions_site_id_published_at ON revisions(site_id, published_at DESC);
```

### Reserved slug list

A static list in code (`packages/site-schema/src/reserved-slugs.ts`) of slugs that cannot be claimed by operators:

```
api, app, www, admin, preview, ftp, mail, blog,
status, dashboard, control, docs, help, support,
1stcontact, gendev, gendevlabs
```

The `INSERT` for the 1st Contact marketing site (existing `sites/1stcontact/site.json`) uses slug `1stcontact` from this reserved list — operator-owned, not user-allocatable.

### Slug validation

`packages/site-schema/src/slug.ts`:

```typescript
function isValidSlug(s: string): boolean
function isReservedSlug(s: string): boolean
function suggestAlternativeSlug(taken: string): string[]
```

- Valid slug: 3–40 chars, lowercase ASCII + digits + hyphens, no leading/trailing hyphen, no consecutive hyphens.
- Suggestions on collision: `<slug>-<short-hash>`, `<slug>-co`, `<slug>-app`, etc.

### Seed data

A one-time seed migration `005_seed_1stcontact.sql` that inserts the platform-owned account and the 1st Contact site row, pointing `draft_definition` and `published_definition` at the contents of `sites/1stcontact/site.json` from the repo. This makes `1stcontact.io` D1-backed in the same way customer sites will be — closing the gap between file-backed and D1-backed paths over time.

### Types

`packages/site-schema/src/db-types.ts` — TypeScript types matching each table row, plus `SiteRecord`, `AccountRecord`, `RevisionRecord` with parsed-JSON variants.

## UATs (`test_UAT_FC_<REQ-ID>_*`)

- `migrations_apply_clean` — fresh D1, apply all migrations including seed; tables exist, indexes exist, seed row present.
- `migrations_reversible` — each migration has a `DROP` counterpart that leaves the schema empty.
- `slug_validation_accepts_valid` — `acme`, `my-bakery`, `a-1-b` accepted.
- `slug_validation_rejects_invalid` — empty, too short, too long, uppercase, special chars, consecutive hyphens, leading/trailing hyphen, all rejected.
- `slug_validation_rejects_reserved` — `api`, `www`, `admin`, `preview`, `1stcontact` rejected as reserved.
- `slug_collision_suggestions_non_empty` — `suggestAlternativeSlug('taken')` returns at least three candidates not equal to the input.
- `unique_constraint_on_slug` — inserting two sites with the same slug fails with a unique-constraint violation.
- `seed_1stcontact_loads_real_definition` — the seeded `1stcontact` site's `draft_definition` parses to a valid Site per the `@1stcontact/site-schema` validator from REQ-3.

## Out of scope

- Magic-link / sessions tables — separate auth REQ.
- Custom-domain mappings — later REQ (paid feature).
- Asset records (R2 refs) — already partly covered in REQ-3's `AssetRef` type; binary storage and full asset CRUD comes with a later REQ.
- Audit log table — later, alongside system-action audit.
- Soft-delete columns — later if needed; v1 sites are not deletable.

## Risks / open items

- **JSON column size** — D1 SQLite TEXT columns hold large JSON fine; site definitions are typically well under 1MB. Add a guard in API REQs that rejects definitions exceeding 5MB pre-persist.
- **Slug-uniqueness race** — `INSERT` race on slug uniqueness is handled by the UNIQUE constraint at the DB level. API REQs catch the constraint violation and return a 409 with suggestions.
- **Bootstrap path** — the 1st Contact site is currently file-backed (`sites/1stcontact/site.json` per REQ-6). Post-this-REQ it's also in D1 via seed. Both paths coexist briefly; `tools/generate` should be updated by a later REQ to read from D1 when available.


## Coordination note from REQ-20 (added 2026-06-18)

REQ-20 (web fetch safety + R2 assets) is landing **before** this REQ and needs an `account_id` for its per-account rate-limit and Browser Rendering budget counters. Because the `accounts` table does not yet exist, REQ-20 extracts `account_id` from the `x-account-id` request header with a `"default"` fallback, behind a single function (`extractAccountId(request, env)`) in `apps/control-app/src/safety/account.ts`.

**Action for REQ-10:** when implementing the accounts schema and the auth path that issues `account_id`, update `extractAccountId` (or replace the call site) to resolve `account_id` from the authenticated session / magic-link cookie instead of the header. The function signature is the only contract REQ-20 depends on — replacing the body is sufficient; no shape change in the KV counter keys is required.

KV counters in `FETCH_RATE_KV` and `BROWSER_BUDGET_KV` are keyed by `account_id`. Switching from `"default"` to real account IDs migrates cleanly (existing default-keyed counters become orphaned and age out via TTL).