---
uid: report-7fd62f46
id: REPORT-724
type: report
title: 'Capability-Intent Alignment: Platform Deployment Infrastructure (level=story)'
created_by: xgd
created_at: '2026-06-28T21:43:26.665376+00:00'
updated_at: '2026-06-28T21:43:26.665376+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: capability_validation
  subject_uid: capability-8bfbe75a
  level: story
  violations: 0
  warnings: 0
  needs_review_count: 0
---

# Capability-Intent Alignment: Platform Deployment Infrastructure
# Level: story

**Result**: PASS
**Violations**: 0
**Warnings**: 0
**Needs review**: 0

## Cumulative Intent Considered

This capability (CAP-31 / capability-8bfbe75a) holds exactly one story —
STORY-38 (story-067dc2f8, `feature`, "Monorepo + two-Worker Cloudflare
deploy pipeline"). Its `intent_uid` is **bundle-94e1d1b6**, a reconciled
bundle (`merged_at_commit: 8ebe122e`) that spawned nine stories across
nine capabilities. Only three of the bundle's source REQs touch the
deployment-infrastructure surface; the remaining REQs created other
capabilities' stories (site-schema, framework chrome/content modules,
generator, public-site Worker, lead capture, builder SPA).

Chronological ledger (ordering within the single bundle, by REQ number):

| Intent ID | Status | When | Asked / changed (deployment-infra surface only) | Counts? |
|---|---|---|---|---|
| REQ-1 | reconciled (in bundle-94e1d1b6, merged 8ebe122e) | bundle merge | pnpm monorepo + scaffolding (apps/, packages/, sites/, tools/, db/migrations/, tests/); two Worker apps with placeholder responses; toolchain pinning (Node 20+, pnpm 9+, corepack, frozen lockfile); CI (PR install+build+test+dry-run both Workers); CD (push to xgd-stable → deploy both Workers production, concurrency group) | YES |
| REQ-2 | reconciled (in bundle-94e1d1b6) | bundle merge | rename `first-contact`→`1stcontact` across root package.json name, both wrangler worker names, `sites/` subdir, CLAUDE.md heading (folded into this story as identifier-alignment ACs) | YES |
| REQ-6 | reconciled (in bundle-94e1d1b6) | bundle merge | superseded the public-site placeholder (now serves generated static assets — retires REQ-1's public-site placeholder); added "Generate public-site static output" step to ci.yml/deploy.yml before tests/dry-run/deploy (step ownership assigned to the Public Site Worker story) | YES (incl. retirement) |

REQ-3/4/5/7/8 from the same bundle do not touch this capability — they
created stories under other capabilities (verified via
`intent_uid=bundle-94e1d1b6` → 9 sibling stories, one per capability).

## Alignment Ledger

| Element | Intents aligned to | Outcome |
|---|---|---|
| STORY-38 (story-067dc2f8) | REQ-1, REQ-2, REQ-6 (via bundle-94e1d1b6) | aligned — body expresses all deployment-infra asks; correctly retires REQ-1's public-site placeholder per REQ-6 supersession; correctly folds REQ-2 slug rename as identifier-alignment ACs; cleanly disclaims the generate step + public-site placeholder as owned by the Public Site Worker story (story-f632db8a) |

## Findings

| # | Severity | Property | Element | Resolution category | Issue | Suggested edit |
|---|---|---|---|---|---|---|
| 1 | info | consistency | STORY-38 | — | Story body's "Out of scope" + "Technical Context" sections explicitly document the REQ-1→REQ-6 supersession (public-site placeholder retired; UAT deleted) and the REQ-2 slug fold-in. This matches the cumulative intent exactly. | none |
| 2 | info | exclusivity | STORY-38 vs story-f632db8a | — | Story body assigns the "Generate public-site static output" workflow step and the public-site placeholder behavior to the Public Site Worker story (a different capability), asserting only CI/deploy triggers, build/test/dry-run ordering, and production deploy of both Workers. Clean boundary split — no double-coverage. | none |

## Verification performed (read-only)

Concrete story-body claims were checked against the merged tree to
confirm the body does not describe behavior the merged state contradicts:

- root `package.json` `name: "1stcontact"`, `engines {node>=20, pnpm>=9}`, `packageManager: pnpm@9.12.0` ✓
- `pnpm-workspace.yaml` lists apps/*, packages/*, tools/* ✓
- `apps/control-app/src/index.ts` returns `Hello from app.1stcontact.io` (placeholder still present) ✓
- wrangler worker names `1stcontact-control-app`, `1stcontact-public-site` ✓
- `sites/1stcontact/` present; CLAUDE.md heading `# Claude Instructions for 1stcontact`; `pnpm-lock.yaml` committed ✓
- `ci.yml` triggers on PR→[main, xgd-working, xgd-stable] + dispatch; order install→build→generate→test→dryrun(public)→dryrun(control) ✓
- `deploy.yml` triggers on push→xgd-stable + dispatch; has `concurrency` group; deploys both Workers via `wrangler deploy --env production` ✓
- public-site placeholder is gone (REQ-6 supersession), exactly as the body states ✓

## Notes for the Editor

No action required. STORY-38 is a model of a well-reconciled story body:
it carries the supersession history in-band rather than leaving stale
REQ-1 placeholder language behind. The single-story capability means
exclusivity is trivially satisfied within the capability; the only
cross-capability concern (generate step / public-site placeholder) is
explicitly disclaimed and assigned to story-f632db8a.
