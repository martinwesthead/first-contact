---
uid: comment-994933a6
id: COMMENT-153
type: comment
title: Comment on bug BUG-15
created_by: xgd
created_at: '2026-06-25T00:17:29.409809+00:00'
updated_at: '2026-06-25T00:23:38.550108+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  subject_uid: bug-27ffa05a
  kind: chat_transcript
---

<!-- xgd-turn id="b97c4d3f-2937-450e-a98e-443c46c80427-user" -->

<!-- xgd-chat role="user" ts="2026-06-25T00:15:35.590Z" -->
#### You
Please can you fix this?

<!-- xgd-turn id="b97c4d3f-2937-450e-a98e-443c46c80427-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-25T00:23:38.548Z" -->
#### Claude
Let me look at how the test runs and what site is built by default:

Let me check the site schema to understand the AssetRef structure:

Now I'll update the ticket body to add the fix scope and test plan, preserving the existing content:

Now let me implement the fix:

Now add the `inlineLocalAssetsForPreview` helper:

Now let me write the UAT tests:

Now let me run the test suite to verify the fix works:

All 5 UATs pass. Let me also run the existing preview-related tests to confirm no regressions:

All 19 existing preview-related tests pass. Let me also run the broader render and operator action tests to catch any unexpected regressions:

All 706 tests pass across 269 test files. Let me also run typecheck on the affected workspace:

These typecheck errors are pre-existing in `packages/builder-ui` (DOM types) and `index.ts` (unrelated env types). Let me verify my new file specifically has no type errors:

No type errors in my changed files. Let me also confirm no regressions by running lint if available:

Now bump the version and commit:

Now stage and commit:

Now move the ticket to `free_coded`:

Ticket is at `free_coded` with the commit recorded. Summary:

**What changed**: `preview_generated_page` now inlines `/assets/<key>` references in the rendered HTML as `data:<contentType>;base64,<bytes>` URLs before wrapping it in the `data:text/html` navigation URL. The headless browser now resolves hero `bg-image`, services-grid item images, and header/footer logos correctly instead of silently 404'ing — fixing the screenshot blindness for image-heavy sites.

**Files**:
- `apps/control-app/src/operator/preview-generated-page.ts` — added `inlineLocalAssetsForPreview(html, bucket)` and called it between `renderSiteToHtml` and `htmlToDataUrl`. Missing R2 keys preserve the original `src` for graceful degradation; `draftId` still hashes the un-inlined HTML so content-addressing stays stable.
- `tests/test_UAT_FC_BUG-15_preview_inlines_local_assets.test.ts` — 5 UATs covering hero inlining, services-grid + logo inlining, missing-asset graceful degradation, partial resolution, and draftId stability.
- `package.json` — version 0.0.37 → 0.0.38.

**Verification**: all 706 tests pass (5 new + 701 pre-existing); no typecheck errors in the touched file.

**Ticket**: BUG-15 (bug-27ffa05a) is at `status=free_coded`, `commits=[d8b762d3...]`, `version=0.0.38`, `story_points=2`. Parked here pending your promotion to `ready_to_reconcile` when you're ready.

<!-- xgd-chat-end -->