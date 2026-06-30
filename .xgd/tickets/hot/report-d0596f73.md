---
uid: report-d0596f73
id: REPORT-869
type: report
title: 'Reconcile resolve conflicts: reconcile-BUNDLE-9'
created_by: xgd
created_at: '2026-06-30T03:55:45.434728+00:00'
updated_at: '2026-06-30T03:55:45.434728+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: resolve_conflicts
  subject_uid: reconcile-BUNDLE-9
---

## Files resolved

- `packages/builder-ui/src/spa.ts` — class UU (code file). Rule 2c: incoming
  (free_coded `b2ece207`) is authoritative. HEAD carried the `bootFromQuery`
  wrapper from the prior single-session refactor (`ed1f456f`); the incoming
  commit reverts the SPA entry to inline-fetch and derives the chat-session
  siteId as `site_<slug>` (DB seed convention from db/migrations/0005). The
  two regions are mutually exclusive — incoming wins; took the incoming
  version wholesale (`checkout --theirs`).

The other three paths in the cherry-pick applied cleanly (no conflict markers)
and are staged as-is:
- `apps/control-app/wrangler.toml` — M (migrations_dir add)
- `packages/builder-ui/src/main.ts` — M (appendBootErrorMessage / visible boot errors)
- `tests/test_UAT_FC_REQ-25_boot_error_surface.test.ts` — A (new UAT)

## Incoming changes preserved

- `spa.ts`: resolved content is **byte-identical** to `b2ece207:spa.ts`
  (verified via diff — empty). The siteId-mapping intent (`site_${siteName}`),
  inline starter-site fetch, and `bootBuilder({ root, initialSite, siteId })`
  call are all present. No developer code discarded.

## Notes

Cross-check: `b2ece207`'s `spa.ts` is also identical to the final
`xgd-working` state, and no later bundle commit touches `spa.ts`, confirming
this resolution matches the source-of-truth end state. The now-unused
`bootFromQuery` export remains in `main.ts` (owned by a separate commit) —
left untouched per minimal-resolution scope; valid intermediate reconcile state.

Cherry-pick left paused (CHERRY_PICK_HEAD intact); `--continue` deferred to
cherry_pick_finalize_resolution.
