---
uid: report-e894be85
id: REPORT-804
type: report
title: 'Code Review: bundle-4e8020d6 (BUNDLE-6)'
created_by: xgd
created_at: '2026-06-29T23:02:57.289306+00:00'
updated_at: '2026-06-29T23:02:57.289306+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: code_review
  subject_uid: bundle-4e8020d6
  anchor_uid: bundle-4e8020d6
---

# Code Review — BUNDLE-6 (bundle-4e8020d6)

**Result**: PASS
**Mode**: commits
**Anchor**: bundle-4e8020d6 (BUG-11 + REQ-10 + REQ-37 + REQ-36 + REQ-38 + REQ-41)
**Cherry-picked commits reviewed**: 11 (7 behaviors + 4 version bumps)

## Summary

The free-coded implementation is well-structured, matches surrounding patterns, and is correctly wired into its usage contexts. Lint passes, the bundle's UATs pass (sampled 28 tests green; reconciliation gate passed), and BUG-11's actual target (the extractor build) is verified clean. `pnpm build` as a whole is RED, but every one of the 79 control-app type errors is **pre-existing on `main`** — the bundle introduces zero new build errors and takes no green package to red. Per reconcile practice (pre-existing, out-of-scope failures do not block a bundle), this is recorded as a critical follow-up, not a blocker.

## Quality Gates

| Gate | Status | Evidence |
|------|--------|----------|
| Lint | PASS | No per-package lint script; `xgd quality` lint recorded success (exit 0). |
| Tests | PASS | Reconciliation test runs gated green; independent sample 28/28 (REQ-10 slug+migrations, REQ-37 read-back, REQ-38 throw-isolation). |
| Build (scoped) | PASS | BUG-11 target verified: `pnpm --filter @1stcontact/extractor build` → exit 0. `pnpm build` for packages/public-site succeed. |
| Build (`pnpm build` whole) | FAIL — PRE-EXISTING | `apps/control-app` `tsc --noEmit` → 79 errors. **All pre-existing on `main`**, 0 introduced by this bundle. See below. |
| Coverage | PASS | Inherited from reconciliation gate. |

### Build failure analysis (pre-existing — not a blocker)

`apps/control-app/tsconfig.json` inherits only `lib: ["ES2022"]` (base) + `types: [@cloudflare/workers-types]`, but its `tsc --noEmit` type-checks the `@1stcontact/builder-ui` **source** files it imports (`/tools`, `/catalog` resolve to `.ts`), which use DOM globals. Breakdown of the 79 errors:

- **77 errors** — DOM globals in builder-ui sources (`store.ts` `Storage`, `preview.ts` `HTMLIFrameElement`, `transcribe-progress.ts`/`main.ts` `HTMLElement`, `crypto`). Proven pre-existing: `git show main:packages/builder-ui/src/store.ts` already declares `Storage` (lines 47/56/157); `preview.ts` already uses `HTMLIFrameElement` (lines 17/31/70).
- **2 errors** — `apps/control-app/src/index.ts:7,27` `Env` cannot extend both `ChatHandlerEnv` (`ASSETS_BUCKET?: R2Bucket`) and `AssetsEnv` (`ASSETS_BUCKET: R2Bucket`). Proven pre-existing: `ChatHandlerEnv.ASSETS_BUCKET?` is byte-identical on `main` (chat.ts:26) and `index.ts` is not touched by this bundle.

This is the **same class** of defect BUG-11 fixed (a consumer type-checking a package's sources without the ambient libs those sources need), but a different consumer/package pair (control-app -> builder-ui) that BUG-11 explicitly did not scope. A probe (adding `DOM`,`DOM.Iterable` to control-app's `lib`) clears the 77 DOM errors but leaves the `ASSETS_BUCKET` optionality mismatch — so the full remedy is a 2-part infra change owned by no ticket in this bundle.

## External Interface Accessibility

All new entry points wired in — no gaps:
- `image-gallery` registered in `packages/framework/src/modules/registry.ts:42-44`; exported from `modules/index.ts` (`ImageGallery` + `imageGalleryMeta`).
- `read_transcription_digest` `tool_spec` description (`operator/registry.ts:537-545`) updated to match the new `transcription_digest_not_ready` return — no doc drift.
- `slug.ts`, `reserved-slugs.ts`, `db-types.ts` exported from `packages/site-schema/src/index.ts`.

## Code Quality

| File | Finding | Severity |
|------|---------|----------|
| packages/web-fetch-safety/src/{browser-budget,intent-token,rate-limit,types}.ts | `import type { KVNamespace }` — clean type-only import, no runtime change (BUG-11 option 1). | OK |
| packages/site-schema/src/slug.ts | Regex `^[a-z0-9](?:[a-z0-9]\|-(?!-))*[a-z0-9]$` correctly forbids consecutive/leading/trailing hyphens; length bounds enforced separately; suggestion engine valid+non-reserved+deduped. | OK |
| db/migrations/0005_seed_1stcontact.sql | Deterministic seed IDs, doubled single-quotes, soft-pointer note on `published_revision_id`. | OK |
| apps/control-app/src/operator/transcribe-site.ts | Stage-0 digest eviction guarded by `if (env.ASSETS_BUCKET)`; `capturedAt` read-back verification; old `digestKey` decl removed (no shadow). | OK |
| apps/control-app/src/chat.ts | REQ-38 try/catch around injected `applyImpl`; synthesizes `ok:false` + `apply_tool_call_threw` log; sibling calls survive. | OK |
| apps/control-app/src/operator/read-transcription-digest.ts | Missing digest returns `ok({kind:'transcription_digest_not_ready'})` not a hard fail — matches updated tool_spec. | OK |

No leftover debug code, commented-out blocks, TODO stubs, version-suffixed files, or test files in production dirs.

## Checklist Compliance

No architecture, security, or design checklist reports exist for this anchor — sections skipped per review instructions.

## Smoke Test

Bundle entry points exercised via green UATs (no crash on basic invocation): image-gallery render (grid/masonry, item-count bounds), slug validation/suggestions, D1 migrations apply+reverse+seed, chat SSE streaming + throw-isolation, transcribe read-back. Extractor build invoked directly — exit 0.

## Issues Found

**Critical (must fix)**: none introduced by this bundle.

**Warnings (should fix — follow-up, not a blocker for this bundle)**:
- Pre-existing repo build break: `pnpm build` fails because `apps/control-app` `tsc --noEmit` type-checks builder-ui DOM-typed sources without DOM in its `lib`, plus an `ASSETS_BUCKET` optionality mismatch between `ChatHandlerEnv` and `AssetsEnv`. Recommend a dedicated build-hygiene ticket (BUG-11 family): add `DOM`,`DOM.Iterable` to `apps/control-app/tsconfig.json` `lib` (or isolate builder-ui via project references / built declarations) AND reconcile `ASSETS_BUCKET` optionality across `ChatHandlerEnv`/`AssetsEnv`. Out of scope for every ticket in this bundle; do not fold into this reconcile.
- Note for the operator: the `xgd quality` build step recorded `duration_seconds: 0.0` / exit 0 in regression reports, i.e. it is effectively a no-op and did not catch this pre-existing `tsc` failure. Worth verifying the quality build command actually runs `pnpm build`.
