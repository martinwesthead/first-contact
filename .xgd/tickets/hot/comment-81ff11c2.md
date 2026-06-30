---
uid: comment-81ff11c2
id: COMMENT-288
type: comment
title: Comment on bug BUG-22
created_by: xgd
created_at: '2026-06-30T00:30:59.643194+00:00'
updated_at: '2026-06-30T00:32:39.774080+00:00'
completed_at: null
last_field_updated: body
status: null
fields:
  subject_uid: bug-756913ee
  kind: chat_transcript
---

<!-- xgd-turn id="b7592f86-239e-433f-90ac-3f282cf02b8d-user" -->

<!-- xgd-chat role="user" ts="2026-06-30T00:30:44.070Z" -->
#### You
Please free code a fix for this

<!-- xgd-turn id="b7592f86-239e-433f-90ac-3f282cf02b8d-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-30T00:32:39.746Z" -->
#### Claude
I'll start by reading the ticket and the relevant files.

The ticket body is already well-populated with scope and the preferred fix (Option 2). Let me apply the fix — emit one log line per built bundle.

Now let me add a UAT for BUG-22's specific behavior (per-entry log lines) and run the regression scope. First let me check how tests are run.

Now let me add a focused UAT for BUG-22's per-entry log behavior:

Now let me run both the BUG-7 and BUG-22 tests as the regression scope:

All three tests pass. Now bump the version and commit.

The accidental `--file` invocation bumped again to 0.0.44, which is what actually got committed. Let me verify and use the right version:

The commit contains 0.0.44 and the working tree matches. Let me gate with the correct version:

The ticket is at `free_coded`. The body already describes the chosen fix accurately (Option 2 was preferred), but let me append a brief resolution note so the body reflects what was actually implemented:

Done. Fixed and free-coded under BUG-22.

**What changed**

`apps/control-app/scripts/build-builder-bundle.mjs` now emits one log line per built bundle instead of the collapsed brace form. REQ-17 added the `app.js` entry and changed the output to `…/{builder,app}.js`, which broke BUG-7's `/Built .*builder\.js/` assertion (`builder` was followed by `,app}.js`, not `.js`).

- one-shot: `Built …/builder.js` and `Built …/app.js`
- watch: `Watching builder-ui entry → …/builder.js` (and `…/app.js`)

Derived from `buildOptions.entryPoints`, so adding future entries won't break any `Built …/<name>.js` assertion. Log-only — no change to bundle contents.

**Evidence**
- New UAT `tests/test_UAT_FC_BUG-22_build_bundle_per_entry_log.test.ts` — asserts both entries get their own `Built` line and the brace form is gone.
- BUG-7 one-shot + watch tests pass unchanged. All 3 green.

**Lifecycle**
- Commit `4d4aefa` `[FREE-CODED]`, version bumped to 0.0.44.
- Ticket BUG-22 → `status=free_coded`, `fields.commits=[4d4aefa]`, `story_points=1`, body updated with a resolution note (original diagnostic preserved).

One note: during staging, an unrecognized `--file` flag triggered a second version bump (0.0.43 → 0.0.44), so the committed/gated version is 0.0.44. No harm — the commit and `package.json` are consistent.

It's parked at `free_coded` for you to validate. Promote to `ready_to_reconcile` when you're ready for reconcile to fire.

<!-- xgd-chat-end -->