---
uid: report-c378b354
id: REPORT-588
type: report
title: 'Overlap resolution: cluster 2'
created_by: xgd
created_at: '2026-06-27T00:32:51.116358+00:00'
updated_at: '2026-06-27T00:32:51.116358+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: overlap_resolution
  subject_uid: report-cda4212b
  cluster_id: '2'
---

## Cluster 2 Resolution

**Boundary**: Public-site Worker: deployment-pipeline scaffolding vs runtime serving behavior
**Stories resolved**: 2

### Actions

| Story | Action | From | To | Rationale |
|-------|--------|------|-----|-----------|
| story-067dc2f8 (STORY-38) | confirm | capability-8bfbe75a (CAP-31) | (no change) | STORY-38's ACs (AC-384..390) cover only the *generic* deployment substrate: monorepo shape, toolchain pinning (Node 20+/pnpm 9+/frozen lockfile), identifier alignment to the `1stcontact` slug, the control-app placeholder as a Worker-alive smoke test, and the generic CI/deploy workflows that build+dry-run/deploy any Worker (with concurrency and credential injection). None of these ACs touch the marketing site's content, theme, or the public-site Worker's runtime serving semantics. This is exactly CAP-31's declared scope ("monorepo workspace shape… two Cloudflare Worker apps at their initial scaffolding stage… CI… CD… identifier alignment… toolchain pinning"). |
| story-f632db8a (STORY-44) | confirm | capability-474ee896 (CAP-36) | (no change) | STORY-44's ACs (AC-456..463) cover only the *specific* public-site delivery: the Phase 0 marketing site definition (seven-module home page, Manrope/Inter typography, primary/accent palette), the public-site Worker's runtime serving behavior (200 for `/`, 200 for `theme.css`, 404 for unknown paths, delegation to the Static Assets binding), and the generate-step interleaving specific to the public-site app (`build`/`deploy`/`dry-run` scripts regenerate from `sites/1stcontact`; CI runs `generate` before tests and dry-run; deploy runs `generate` before wrangler deploy). This is exactly CAP-36's declared scope ("published Phase 0 marketing site definition… Worker that delivers the pre-generated static output via Workers Static Assets… CI/deploy workflow ordering that keeps generated artifacts in lockstep with deploys"). |

### Why this overlap is acceptable

CAP-36's body explicitly carves out CAP-31 as "Distinct from: Platform Deployment Infrastructure (CAP-31) — the monorepo, Workers scaffolding, and CI/deploy plumbing in general." That carve-out is the boundary, and the stories sit on opposite sides of it:

- **CAP-31 / STORY-38** answers: *"Can we reproducibly build, test, and deploy any Worker in this monorepo?"* — infrastructure that any later feature capability inherits.
- **CAP-36 / STORY-44** answers: *"Does the marketing site render correctly, and does the generate step run in lockstep with deploy so served bundles match the committed site definition?"* — public-site-specific content + runtime behavior + the generate/deploy interleaving.

Both stories touch the public-site Worker and CI/CD (which is what the survey flagged), but they touch distinct facets:
- STORY-38 ensures the public-site Worker *can be deployed at all* (generic wrangler dry-run/deploy plumbing).
- STORY-44 ensures that *what is deployed* matches the committed site definition (generate-before-deploy ordering) and that the Worker *serves correctly at runtime* (Static Assets delegation, 404 handling).

A reassign would either:
- Move STORY-44 into CAP-31 — collapsing the deliberate "infrastructure vs published site" split that CAP-36 names explicitly, and losing the trust boundary between "the pipeline works for anything" and "the marketing site is correct end-to-end".
- Move STORY-38 into CAP-36 — making the generic monorepo/CI/CD substrate (which the builder SPA, lead capture, and other future capabilities all inherit) appear to be public-site-specific.

A merge is inappropriate because the stories describe genuinely different behaviors (scaffolding/CI-CD pipeline vs marketing-site rendering + generate-step ordering), and merging would force one set of ACs to live under a capability whose declared scope doesn't cover them.

Confirm is the correct resolution.
