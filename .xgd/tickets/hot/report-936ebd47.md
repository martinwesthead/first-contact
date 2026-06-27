---
uid: report-936ebd47
id: REPORT-571
type: report
title: 'Resync resolve conflicts: 393ea07289005dc2b83294d2dbb95d9e3563c1d3'
created_by: xgd
created_at: '2026-06-27T00:13:16.113244+00:00'
updated_at: '2026-06-27T00:13:16.113244+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: resolve_conflicts
  subject_uid: report-ebefc874
---

## Cherry-pick context

- CHERRY_PICK_HEAD: 6da55852beb31922b3ac8dc94f98df57c744fba1
  (`feat(extractor,control-app): Browser Rendering escalation, computed signals, screenshots, multimodal commentary (REQ-22) [FREE-CODED]`)
- Resync anchor: report-ebefc874
- Worktree HEAD: 5c45ff22 (post-watermark resync tip)

## Files resolved

- `apps/control-app/package.json` — UU, code file (rule 2c). HEAD side empty in the dependencies conflict block (HEAD had only `builder-ui`); incoming side adds `extractor`, `web-fetch-safety`, `@cloudflare/puppeteer`. Took incoming. Incoming is strict superset — no HEAD content lost.
- `apps/control-app/src/index.ts` — UU, code file (rule 2c). HEAD side empty in the Env interface conflict block; incoming side adds `FETCH_RATE_KV`, `BROWSER_BUDGET_KV`, `BROWSER`. Took incoming. HEAD's non-conflict content (chat route, builder SPA shell route, asset-fallback handler) preserved by the merge driver outside the conflict block.
- `apps/control-app/wrangler.toml` — UU, code file (rule 2c). Two conflict blocks: top-level (HEAD empty, incoming adds KV namespaces, R2 bucket, browser-binding comment) and `[env.production]` (HEAD empty, incoming adds production KV/R2/browser bindings). Took incoming on both. HEAD's `[assets]` and production route preserved outside conflict blocks.
- `apps/control-app/src/operator/analyze-page.ts` — DU. Incoming modifies, main had deleted. Incoming carries REQ-22 escalation→budget→driver→merge→R2→digest wiring — clearly meaningful. `git checkout --theirs && git add`.
- `apps/control-app/src/operator/registry.ts` — DU. Same rule. Incoming wires the analyze-page handler into the operator action registry.
- `packages/builder-ui/src/components/digest-report.ts` — DU. Same rule. Incoming renders the screenshot strip when `digest.screenshotKeys` is populated.
- `packages/extractor/src/escalate.ts` — DU. Same rule. Incoming carries `shouldEscalateToRendered` heuristic (thin_body / js_dominant / operator_request).
- `packages/extractor/src/index.ts` — DU. Same rule. Incoming exports the new escalation/merge/upload/rendered-fetch surface.

DU resolutions (5 files) used `git checkout --theirs` per rule 2a — incoming on every one is part of the REQ-22 feature commit and therefore meaningful. No deletions accepted.

## Incoming changes preserved

Verified each code/implementation file by diffing the incoming commit's delta (`git show 6da55852 -- <file>`) against the resolved working-tree file:

- `package.json`: incoming delta adds `"@cloudflare/puppeteer": "^1.1.0"` — present in resolved file.
- `src/index.ts`: incoming delta adds `BROWSER_BUDGET_KV?: KVNamespace;` and `BROWSER?: unknown;` to `Env` — both present in resolved file.
- `wrangler.toml`: incoming delta adds the Browser Rendering comment block (lines 40-44) and `[env.production.browser]` with `binding = "BROWSER"` — both present in resolved file.
- `analyze-page.ts`, `registry.ts`, `digest-report.ts`, `escalate.ts`, `extractor/src/index.ts`: byte-identical to the version at `6da55852` (taken via `--theirs`).

Note on context lines visible in the full-file diff that are NOT part of 6da55852's delta (e.g. `FETCH_RATE_KV` in `index.ts`, top-level KV/R2 blocks in `wrangler.toml`): these belong to earlier xgd-working commits already integrated into incoming's parent. The 3-way merge driver correctly left them on the HEAD side when HEAD's pre-watermark history lacked them; taking incoming on the conflict blocks brings them across as well, which is the desired resync behavior for this cherry-pick.

## Staging state

`git status --porcelain` shows zero UU/AA/DU/UD/AU/UA entries. All 8 conflict files staged (`M` for in-place modifications, `A` for previously-deleted-now-restored files plus the new files from the incoming commit). Untracked `node_modules` ignored per repo policy. Tree ready for `git cherry-pick --continue` to be invoked by the next workflow step.
