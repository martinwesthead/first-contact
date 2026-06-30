---
uid: report-c8b32fda
id: REPORT-918
type: report
title: Claude fix_review_free_coded report
created_by: xgd
created_at: '2026-06-30T07:05:25.674023+00:00'
updated_at: '2026-06-30T07:05:25.674023+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: fix_review_free_coded
  subject_uid: bundle-93cd5926
---

Both removals left clean structure. All edits are complete and verified.

## Summary

The code review failed on a single **Critical** issue: the `requestOrigin` field on `ActionContext` was orphaned dead code — populated by two producers but read by zero handlers after the BUG-15 data:-URL amendment removed its only consumer. I removed the entire apparatus as directed by the Fix-It Prompt.

**Issues fixed:**

1. **`apps/control-app/src/operator/registry.ts:44-50`** — Deleted the `requestOrigin: string | null` field and its (misleading) doc comment from the `ActionContext` interface.
2. **`apps/control-app/src/operator/router.ts:67,109`** — Deleted the `requestOrigin: safeOrigin(request)` context entry and the now-unused `safeOrigin()` helper. Verified `request` is still used elsewhere in the function (lines 11, 22, 33, 42), so no unused-param warning.
3. **`apps/control-app/src/chat.ts:456,1004-1015`** — Deleted the `requestOrigin: requestOriginOf(request)` context entry and the now-unused `requestOriginOf()` helper. `request` remains heavily used in the surrounding handler.
4. **Test `ActionContext` literals** — Removed `requestOrigin` from all 7 affected test files:
   - `tests/_helpers_REQ-21_analyze_page.ts`, `tests/_helpers_REQ-22_rendered.ts`, `tests/_helpers_REQ-28_transcribe_site.ts`
   - `tests/_helpers_REQ-51_preview.ts` (both the optional field on the opts type **and** the literal)
   - `tests/test_UAT_FC_REQ-46_*` (3 files) and `tests/test_UAT_FC_REQ-33_write_text_asset.test.ts`
5. **`preview-generated-page.ts:73`** — Left the explanatory comment intact as instructed; it correctly describes the *rejected* `{requestOrigin}/assets/...` approach and explains why the data: URL is used instead — it does not imply the field is still read.

**Verification:** A repo-wide grep (excluding `.xgd/` ticket files) confirms zero remaining `requestOrigin`/`safeOrigin`/`requestOriginOf` references in code, except the retained explanatory comment.

**Confidence:** High. This was a single, well-specified mechanical removal with no behavioral change — the field had no readers, so deletion cannot break runtime logic. The producers' only purpose was feeding the dead field, and both helper removals leave their host functions valid. The next review should pass. (Per instructions, I did not run quality checks or commit — the workflow runs lint/build/tests automatically before re-review.)
