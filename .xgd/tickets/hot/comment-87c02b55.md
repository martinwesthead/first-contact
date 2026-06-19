---
uid: comment-87c02b55
id: COMMENT-106
type: comment
title: Comment on request REQ-31
created_by: xgd
created_at: '2026-06-19T23:30:11.236578+00:00'
updated_at: '2026-06-19T23:30:11.333134+00:00'
completed_at: null
last_field_updated: body
status: null
fields:
  subject_uid: request-21208719
  kind: chat_transcript
---

<!-- xgd-cli-session ts="2026-06-19T23:30:09Z" model="claude-opus-4-7" continued_from="new" -->
*Captured by CLI Claude — paraphrased reconstruction from session memory, not raw capture.*

<!-- xgd-chat role="user" ts="2026-06-19T23:30:09Z" -->
#### You
So I was expecting based on what we discussed that restarting the system would reset it - the chat window clears but the site panel still shows the changes that were made

<!-- xgd-chat role="assistant" ts="2026-06-19T23:30:09Z" -->
#### Claude
Clarified: we didn't discuss restart-reset behavior in this thread. The architecture is: chat is in-memory (per REQ-23/24 deferral), clears on reload; site draft is D1-persisted (REQ-10), survives reload. REQ-30's reshape doesn't change that — the converted site still flows through `state_edit` tool calls that mutate the draft.

Two paths if the expected behavior is wanted: (a) a `reset_site_to_seed` action — small, doesn't touch the convert flow; (b) ephemeral-preview-then-commit model — bigger reshape, conflicts with REQ-28's "writes directly into draft" decision.

<!-- xgd-chat role="user" ts="2026-06-19T23:30:09Z" -->
#### You
ok let's go a step at time because it is important that I understand it. When I look at the right hand panel the site created in the first contact framework where is that being served from? Is it being served from a test R2 server?

<!-- xgd-chat role="assistant" ts="2026-06-19T23:30:09Z" -->
#### Claude
Traced the right-hand panel. It is NOT served from R2 (or anywhere remote). The preview is in-process HTML synthesis in the browser:

- Same-origin `<iframe>` (`packages/builder-ui/src/components/preview-panel.ts:54-64`), no `src` URL. Builder calls `document.open / write / close` on it.
- HTML generated client-side by `renderSiteToHtml(...)` in `packages/framework/src/render/browser.ts` from a JS `Site` object held in the builder UI's in-memory store.
- Initial `Site` cold-loads from `/starter-sites/1stcontact.json` (static file served by control-app on port 8788). No D1 read for initial load.
- Tool-call edits mutate the in-memory `Site`; preview re-renders synchronously.
- R2 enters only for `<img>` references inside the rendered HTML — control-app's `/api/assets/get/<key>` route backed by the `ASSETS_BUCKET` binding (Miniflare locally).

Follow-up: at this stage the site shown in the preview is NOT persisted server-side at all — it lives in the browser between reloads. The reason it "still shows the changes" after a restart needs one more trace — likely localStorage or sessionStorage, or a different bootstrap source than the cold JSON.

<!-- xgd-chat role="user" ts="2026-06-19T23:30:09Z" -->
#### You
howe do I clear it?

<!-- xgd-chat role="assistant" ts="2026-06-19T23:30:09Z" -->
#### Claude
Found it: site is persisted in browser localStorage under key `1stcontact_builder_site_v1` (`packages/builder-ui/src/store.ts:41` — the `LS_KEY` constant). That's why it survives reload — chat is in-memory but the site object is written to localStorage on every store change.

Three ways to clear it: console (`localStorage.removeItem('1stcontact_builder_site_v1'); location.reload()`); DevTools Application tab → delete the row → reload; or "Clear site data" for the origin.

Noted: this matches the "reset action" floated earlier as option (a). Offered to scope a real in-app reset button as a separate ~1-SP ticket.

<!-- xgd-chat role="user" ts="2026-06-19T23:30:09Z" -->
#### You
Good can you give me a "reset" button at the top of the panel that does that please while we are testing

<!-- xgd-chat role="assistant" ts="2026-06-19T23:30:09Z" -->
#### Claude
Scoped REQ-31 and implemented:

- Renamed `LS_KEY` to exported `DEFAULT_STORAGE_KEY` in `store.ts` so the constant is reusable.
- `createPreviewPanel` gained an optional `{ onReset?: () => void }` parameter. When provided, a Reset button is rendered in the existing toolbar (`data-fc-preview-reset`, `margin-left: auto` after flex layout). Click → calls `onReset`. Backwards compatible: callers that omit the option get no button (preserves existing REQ-8 viewport-switch UAT).
- `bootBuilder` wires the click to `confirm("Reset the site to the 1stcontact baseline? Edits will be lost.")` → `storage.removeItem(storageKey)` → `location.reload()`. Confirm/reload/key are injectable for tests (`resetPrompt`, `reloadPage`, `storageKey`).
- 4 UATs in `tests/test_UAT_FC_REQ-31_preview_panel_reset_button.test.ts`: no button without callback; button rendered + click handler invoked; bootBuilder confirm=true clears storage + reloads; bootBuilder confirm=false leaves storage intact + does not reload.

Full vitest run: 307 tests pass across 143 files. tsc --noEmit clean. xgd quality run passes (lint + typecheck).

Committed as `e601a77` with `[FREE-CODED]`. Ticket moved to `free_coded` via gating command.

<!-- xgd-chat-end -->