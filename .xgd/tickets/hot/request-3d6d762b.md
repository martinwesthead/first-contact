---
uid: request-3d6d762b
id: REQ-1
type: request
title: 'Monorepo: scaffold workspace + two-Worker Cloudflare deploy pipeline'
created_by: xgd
created_at: '2026-06-12T22:15:43.077670+00:00'
updated_at: '2026-06-12T22:15:43.077670+00:00'
completed_at: null
last_field_updated: created_at
status: draft
fields:
  story_points: 3
  auto_merge_back: true
  needs_review: false
  priority: medium
---

## Scope

Stand up the empty bones of the 1stcontact.io platform: a pnpm monorepo with two Cloudflare Worker apps, scaffolding for all future packages, and a GitHub Actions workflow that auto-deploys both Workers on every push to `xgd-stable`.

Design discussion: see CHAT-10 (Project Build and Deploy), CHAT-7 (Framework), CHAT-9 (Builder).

## Why free-coded

Scaffolding/infrastructure work — no algorithmic design needed, just the right files in the right places. Small, cohesive, single intent.

## What lands

### Repo shape

```
first-contact/
├── apps/
│   ├── public-site/       Worker for 1stcontact.io (placeholder response)
│   └── control-app/       Worker for app.1stcontact.io (placeholder response)
├── packages/
│   ├── framework/         (empty package.json + README placeholder)
│   ├── site-schema/       (empty package.json + README placeholder)
│   ├── builder-ui/        (empty package.json + README placeholder)
│   └── ui-kit/            (empty package.json + README placeholder)
├── sites/
│   └── first-contact/     (placeholder content directory)
├── tools/
│   └── generate/          (empty package.json + README placeholder)
├── db/migrations/         (empty)
├── .github/workflows/
│   ├── ci.yml             PR checks: install + dry-run deploy
│   └── deploy.yml         push to xgd-stable: deploy both Workers
├── pnpm-workspace.yaml
├── package.json           Root workspace config + scripts
└── tsconfig.base.json     Shared TS config
```

### Worker placeholders

- `apps/public-site/src/index.ts`: returns `"Hello from 1stcontact.io"` (text/plain, 200)
- `apps/control-app/src/index.ts`: returns `"Hello from app.1stcontact.io"` (text/plain, 200)
- Each app has its own `wrangler.toml`:
  - `public-site`: routes to `1stcontact.io/*` on the Cloudflare zone
  - `control-app`: routes to `app.1stcontact.io/*`
  - Both: `compatibility_date = "2026-06-01"`, `nodejs_compat` flag
  - No D1/R2/KV bindings yet (separate tickets)

### Root scripts (package.json)

- `pnpm dev` — runs `wrangler dev` for both Workers in parallel (different ports)
- `pnpm dev:public` / `pnpm dev:control` — individual
- `pnpm -r build` — workspace-wide build
- `pnpm test` — vitest across all packages
- `pnpm deploy:public` / `pnpm deploy:control` — manual deploy escape hatch

### GitHub Actions

**`.github/workflows/deploy.yml`**: triggered on `push` to `xgd-stable`. Steps:
1. Checkout, setup-node 20, pnpm install
2. `pnpm -r build`
3. `wrangler deploy --config apps/public-site/wrangler.toml`
4. `wrangler deploy --config apps/control-app/wrangler.toml`

Uses `concurrency: deploy-${{ github.ref }}` to serialize.

Secrets required (set manually before first deploy works):
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

**`.github/workflows/ci.yml`**: triggered on PRs. Steps: checkout, install, build, `wrangler deploy --dry-run` on both Workers.

## Explicitly NOT in this ticket

- D1 database creation, schema, or migrations
- R2 buckets or KV namespaces
- Framework package code (section library, renderer, theme tokens)
- Builder SPA implementation
- Real FC homepage content / static generator
- Preview deploys for PRs
- Custom domain DNS records (zone exists via Cloudflare registration; routes will bind on first deploy)

## Test approach (UATs)

UAT runner: vitest (added as root devDep).

- `test_UAT_FC_<TICKET-ID>_public_site_returns_placeholder` — uses `unstable_dev` from wrangler to boot `apps/public-site`, fetches `/`, asserts 200 and body matches `Hello from 1stcontact.io`.
- `test_UAT_FC_<TICKET-ID>_control_app_returns_placeholder` — same for `apps/control-app`.
- `test_UAT_FC_<TICKET-ID>_deploy_workflow_lints` — parses `.github/workflows/deploy.yml` with a YAML lib and asserts: triggers on push to `xgd-stable`, runs `wrangler deploy` for both apps, references the two required secrets.
- `test_UAT_FC_<TICKET-ID>_ci_workflow_lints` — same shape for `ci.yml`.

## Test plan

Regression scope: this is a brand-new repo with no prior code, so the regression scope is the four UATs above plus `pnpm -r build` succeeding (also caught by ci.yml).

## Open items (pre-handoff)

None — domain confirmed (1stcontact.io via Cloudflare), GitHub confirmed, monorepo confirmed.