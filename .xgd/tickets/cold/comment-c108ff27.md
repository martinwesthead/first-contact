---
uid: comment-c108ff27
id: COMMENT-111
type: comment
title: Comment on bug BUG-7
created_by: xgd
created_at: '2026-06-20T00:25:11.277318+00:00'
updated_at: '2026-06-20T00:29:23.894997+00:00'
completed_at: null
last_field_updated: body
status: null
fields:
  subject_uid: bug-c37cc198
  kind: chat_transcript
---

<!-- xgd-turn id="8ffd12bb-0d4e-4442-9f8b-40f9930ae9e1-user" -->

<!-- xgd-chat role="user" ts="2026-06-20T00:24:44.392Z" -->
#### You
Please free code a solution to this

<!-- xgd-turn id="8ffd12bb-0d4e-4442-9f8b-40f9930ae9e1-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-20T00:29:23.868Z" -->
#### Claude
Now I have a clear picture. Let me check the current version file and existing tests structure.

I have a clear picture. Now I'll implement the fix:

1. Update `build-builder-bundle.mjs` to support `--watch`
2. Update `apps/control-app/package.json` to use concurrently in `dev`
3. Write a UAT that exercises the watch behavior

Let me check how existing tests are structured to follow the convention.

Now I'll write a UAT for BUG-7 that exercises both one-shot and watch modes of the build script.

Now let me run the test to verify it passes.

Both tests pass in 251ms. Let me run a small regression scope to ensure no adjacent tests are broken.

Tests pass. Now bump the version and commit.

Prior FREE-CODED commits bump root `package.json`. The bump script is a stub, so I'll bump it manually.

BUG-4 used `0.14.1236` (matching the XGD CLI version). Let me retry with the matching XGD version.

Ticket is at `free_coded`. The original ticket body said "no automated UAT is realistic" but I did add one — let me refresh the body so it accurately reflects the shipped implementation before handoff.

Done. BUG-7 is at `status=free_coded` with the fix committed and a UAT covering both modes.

**What shipped (commit `4bd1609`):**
- `apps/control-app/scripts/build-builder-bundle.mjs` — accepts `--watch`, uses `esbuild.context().watch()` for incremental rebuilds.
- `apps/control-app/package.json` — adds `build:bundle:watch`; rewires `dev` to run the watcher and `wrangler dev` together via `concurrently` (already a root devDep).
- `tests/test_UAT_FC_BUG-7_build_bundle_watch.test.ts` — UAT for both one-shot (exit 0 + bundle written) and watch (initial `Watching` log + bundle mtime advances after the entry source is touched).
- Root `package.json` 0.0.8 → 0.0.9.

Tests pass in ~250ms. Ticket body refreshed to reflect what actually shipped (added the UAT path; the original "no automated UAT is realistic" note was superseded). Park at `free_coded`; promotion to `ready_to_reconcile` is your call.

<!-- xgd-chat-end -->