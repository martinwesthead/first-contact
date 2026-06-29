---
uid: report-cde6c43a
id: REPORT-766
type: report
title: Claude fix_reconciliation_review report
created_by: xgd
created_at: '2026-06-29T00:24:19.585007+00:00'
updated_at: '2026-06-29T00:24:19.585007+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: fix_reconciliation_review
  subject_uid: bundle-d4ce3987
---

All three gaps are addressed. The ticket auto-commits handled the AC-683 matrix edit; the code/test changes are staged in the working tree for the workflow to pick up.

## Summary

**Stories created**: none — no uncovered behavior; all bundle-delta behaviours already had stories.

**Stories modified**: none at the story level.

**ACs modified**:
- **AC-683** (story-067dc2f8 / STORY-38) — added an explicit "Evidence limitation (accepted)" section (GAP 3). Documents that `wrangler dev` is impractical/flaky to spawn in CI, that the load-bearing watch/one-shot bundler behaviour is already proven behaviorally by sibling AC-681/AC-682 (which spawn the real bundler), and that AC-683 covers only the `concurrently -k` wiring — observable in `package.json`. This converts the silent source-inspection weakness into an explicitly accepted limitation, which the review states is a valid resolution. Verified the AC wording matches the real `dev` script.

**Stories deleted**: none.

**Code changes**:
- **Deleted** `tests/test_reconciliation_convert_flow_cards.test.ts` (GAP 1) — the pre-REQ-35 orphan that asserted a 4-row card and imported the deleted `registerConvertConfirmation` symbol, failing 5 tests while contradicting active AC-662/AC-666. Confirmed it was the *sole* remaining reference to that deleted symbol; the replacement `test_reconciliation_transcribe_progress_card.test.ts` covers AC-662/666/701/702 with the correct 5-row assertion.
- **Regenerated** `apps/control-app/src/llm-context.ts` (GAP 2) — synced `REPRODUCING_A_WEBSITE_DOC` from `docs/llm-context/reproducing-a-website.md`, adding the missing §8 "Beyond convert — other edit tools" block (`duplicate_module`, `set_page_metadata`, `set_nav_pattern`/`set_nav_entries`, `remove_page`/`reorder_pages`) and the "Wire up the nav" step. Verified the constant round-trips to the `.md` **byte-for-byte**, so the drift-guard (`test_UAT_FC_BUG-5_doc_states_assetref_format.test.ts`) passes and the REQ-14 tools are now visible to the model at runtime — closing the genuine AC-704 / AC-717 runtime defect.
- **Strengthened** `tests/test_UAT_AC683_*.test.ts` — added an assertion that the `dev` script includes `-k`/`--kill-others`, matching the "tears both down together" criterion (the teardown gap the review noted). Not a weakening — a new assertion against real behaviour.

**Confidence**: High. The two material gaps (GAP 1 red test, GAP 2 runtime drift) are resolved at the source of the failure — the failing test is gone and the drift guard now matches byte-for-byte (verified). GAP 3 takes the review's explicitly-sanctioned "document the limitation" path and additionally hardens the test. Per instructions I did not run the suite; the workflow will execute it next.
