---
uid: chat-e1d133fa
id: CHAT-18
type: chat
title: Wrangler update?
created_by: xgd
created_at: '2026-06-20T19:22:27.356531+00:00'
updated_at: '2026-06-20T19:32:48.863984+00:00'
completed_at: null
last_field_updated: fields
status: open
fields:
  fields:
    commits:
    - 40d7ded8471ebd4325044bf77418895bcf7e1871
---

**Question**: Are we on wrangler 3.114.17 for a reason? Should we update?

**Answer**: No reason — `^3.80.0` was scaffolded with the monorepo (commit `3e856c3 scaffold: monorepo + two-Worker Cloudflare deploy pipeline`); nothing in code/config depends on v3.

**Action taken**: Bumped to wrangler `^4.103.0` (Cloudflare's current major).

- root + control-app + public-site `package.json` → `wrangler ^4.103.0`
  (root was already at v4 from `65e79b6`; workers still at v3 — now aligned)
- root + control-app + public-site + web-fetch-safety → `@cloudflare/workers-types ^4.20260617.1` (satisfies v4's peer dep)
- `pnpm-lock.yaml` regenerated; resolved `wrangler 4.103.0` + `workers-types 4.20260620.1`

**Verification**: `pnpm install` clean; `vitest` 394/394 pass; both apps pass `wrangler deploy --dry-run` under v4.103.0 with all bindings intact (D1, KV×4, R2, ASSETS).

**Notes for follow-up**:
- v4 emits a new warning on multi-env configs about implicit env selection (`use -e or CLOUDFLAY_ENV`). Non-blocking; left as-is for dryrun sanity checks. If we want strictness, add `--env=""` to the `dryrun` script.
- Pre-existing (NOT caused by this bump) typecheck issue in `packages/extractor`: `tsc --noEmit` fails with TS2304 on `KVNamespace` from web-fetch-safety sources. Reproduces under v3 lockfile too. Out of scope here.

**Commits**: `40d7ded`
