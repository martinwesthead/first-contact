---
uid: comment-07fbc4e9
id: COMMENT-134
type: comment
title: Comment on bug BUG-13
created_by: xgd
created_at: '2026-06-21T00:17:56.631923+00:00'
updated_at: '2026-06-21T18:23:47.742892+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  subject_uid: bug-c9f8fb69
  kind: chat_transcript
---

<!-- xgd-turn id="da4c0765-4f36-4113-959a-bb48684715d3-user" -->

<!-- xgd-chat role="user" ts="2026-06-21T00:17:49.303Z" -->
#### You
Do you have enough information to fee code a ticket for this?

<!-- xgd-turn id="da4c0765-4f36-4113-959a-bb48684715d3-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-21T00:18:04.143Z" -->
#### Claude
No — ticket BUG-13 is currently blank, so I have no scope to code against. Let me check its current state.

Confirmed — the ticket is empty (title "Untitled", body "(new ticket)", no fields beyond defaults). I can't free-code anything yet because there's no behavior described.

To proceed, I need from you:

1. **What's the bug?** Symptom / what's going wrong, and where (which app, which surface — `apps/control-app`, `apps/public-site`, `packages/framework`, etc.).
2. **Reproduction steps** if you have them, or the conditions under which it appears.
3. **Expected vs actual behavior.**
4. **Severity** (low / medium / high / critical) — currently defaulted to medium.

Once you describe it, I'll populate the ticket body (title + repro + root cause if known + fix + test plan), confirm scope with you, and only then start coding.

<!-- xgd-turn id="f4e6e6bd-1b36-4781-b9df-1396d1ec11de-user" -->

<!-- xgd-chat role="user" ts="2026-06-21T18:13:19.991Z" -->
#### You
try now

<!-- xgd-turn id="f4e6e6bd-1b36-4781-b9df-1396d1ec11de-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-21T18:23:46.736Z" -->
#### Claude
Excellent — clean picture now. Plan locked:

- **Why this fix**: `parseImagery` walks inline `style` + `<style>` blocks but never fetches the 39 external stylesheets a typical WP site loads. Hero `background-image` declared in `style.css` is invisible to the static path. The rendered/computed path catches some cases via narrow selectors (`.hero`, `.banner`, etc.), but misses anything that doesn't match.
- **Design**: keep `parseImagery` pure. Add a new async helper `extractExternalStylesheetAssets(html, baseUrl, fetcher)` in `packages/extractor/src/`. Wire it into the transcribe pipeline (which already has `safeFetch`). Merge its output into the asset inventory using the same dedup pattern.
- **UAT**: direct unit-style UAT on the new helper with a fake fetcher (mirrors the existing REQ-21 test style).

Let me look at the actual transcribe wire-up and `extract.ts` to know exactly where to plug in.

Wait — important: `parseImagery` runs inside `extractSignals` during `analyze_page`, NOT during `transcribe_site`. The transcribe handler just consumes a pre-built digest. I need to find the analyze_page handler to know where to actually wire the fix in.

I have the full picture now. Wire-up point: `analyze-page.ts:113`, right after `extractSignals(html, fetched.finalUrl)`. Pattern already exists: `mergeComputedSignals` augments static signals with rendered data — I'll add the external-stylesheets pass with the same dedup-by-URL approach. Let me update task status and start.

`walkCssRules` already recurses into `@media`. I have enough — writing the helper, tests, and wire-up now.

Now export from the package index and run the new test to confirm it passes against the helper.

All 8 UATs pass. Wiring into `analyze-page.ts` now.

Now verify nothing broke. Running the full extractor/test suite and a type check on the control-app.

All 635 tests pass including my 8 new BUG-13 UATs. The typecheck errors are pre-existing in `packages/builder-ui` (DOM lib missing from tsconfig) — nothing in my touched files. Let me confirm with a targeted check.

The stash inadvertently rolled back my changes. Restoring them now.

Restored. Now confirm my edits don't introduce new errors (search the typecheck output for my touched files specifically).

Clean. Updating task and moving to commit + ticket update.

Convention is `fix(<scope>): description (TICKET-ID) [FREE-CODED]`. Committing now (explicit file list, NOT staging `.dev.vars`).

Commit landed as `9ebaf2c`. Updating ticket status and recording the commit sha.

Status gating requires a version bump first. Let me bump version then run `move-to-free-coded`.

Unexpected modification appeared in `packages/extractor/src/schema.ts` — investigating before touching anything else.

The schema.ts change is unrelated (REQ-49 work, adds `LayoutBoundingBoxes` + `font` AssetKind). Leaving it untouched in the working tree — not bundling unrelated work into BUG-13. Re-doing the version bump with package.json already read.

Now run `move-to-free-coded` with both SHAs and the new version.

Status updated. Now appending implementation notes to the body (the checklist explicitly called this out).

Done. BUG-13 is `free_coded` with both commit SHAs and version 0.0.28 recorded; original body preserved with implementation notes appended.

**Summary:**
- Root cause was narrower than the ticket described: inline `style=""` and `<style>` blocks were already handled — only **external stylesheets** were missed, which is the actual case on joyfulculinarycreations (39 `<link rel=stylesheet>`, no `<style>`-block backgrounds).
- Fix: new `external-stylesheets.ts` helper (concurrent fetch + `walkCssRules` + url() extraction) wired into `analyze-page.ts` between `extractSignals` and the rendered merge. url()s resolve relative to the stylesheet per CSS spec; `data:` URLs filtered; `@import` chains documented as out-of-scope.
- Two commits: `9ebaf2c` (fix) + `5755490` (version bump 0.0.27→0.0.28). Both tagged `[FREE-CODED]`.
- 8 new UAT cases pass; full 635-test suite still green; no new typecheck errors in touched files.
- Unrelated `packages/extractor/src/schema.ts` change (REQ-49 bounding-boxes + `font` AssetKind) and `apps/control-app/.dev.vars` left untouched in the working tree — they belong to other scope.

<!-- xgd-chat-end -->