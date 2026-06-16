---
uid: chat-90cbbf39
id: CHAT-14
type: chat
title: Asset manager
created_by: xgd
created_at: '2026-06-16T22:01:48.004010+00:00'
updated_at: '2026-06-16T23:04:38.650269+00:00'
completed_at: null
last_field_updated: body
status: open
fields: {}
---

<!-- xgd-turn id="021e5ec8-9017-466d-a2b3-8eff1e21db63" -->

<!-- xgd-chat role="user" ts="2026-06-16T22:06:40.484Z" -->
#### You
I think there is a need for an asset management tool. It would have a file space listed on the left-hand side, a movable panel separator and on the right panel there would be a detailed view/editor. I think we would mostly be accommodating text and markdown files which could be edited. We should also accommodate the inclusion of images. I think we need to be able to do some very very basic image manipulation, cropping, perhaps converting into different formats rotation – that's probably enough to get us started. For the editor please look at the editors in ../xgendev-main where we use tiptap

<!-- xgd-chat role="assistant" ts="2026-06-16T22:06:40.484Z" -->
#### Claude
Before drafting a scope, let me quickly look at the tiptap setup in `../xgendev-main` and the current `apps/control-app` shape so the proposal fits both.

Quick read of the lay of the land before I propose scope:

- **Monorepo**: `apps/control-app` (Worker + chat builder), `packages/builder-ui` (vanilla TS chat/preview/store/tools), `packages/site-schema` already has `AssetRef`, `sites/1stcontact/assets/` is where file-backed assets live today.
- **TipTap pattern in `xgendev-main`**: lazy ESM-loaded from `esm.sh` at runtime (Editor, StarterKit, placeholder, tables). No bundler dependency — works straight in the browser. That's a clean fit for this codebase.

Recommendation before I touch anything:

**This is too big for one free-coded ticket.** The full ask (split-panel UI + TipTap editor + image viewer + cropping/rotation/format conversion + wherever assets are stored) crosses ~4 separable concerns and likely 15+ story points. Free-coding caps at 20 and bundles best at 1–3. I'd suggest splitting into **two tickets**:

1. **Asset browser + text/markdown editor** — left file list, draggable splitter, right-side TipTap editor for `.md`/`.txt` files in `sites/1stcontact/assets/`, image files render as previews (no editing). This is the panel + editor scaffolding.
2. **Image manipulation** — crop / rotate / format convert (PNG↔JPEG↔WebP). Built on top of (1) once the asset detail panel exists.

One open question that affects scope shape: is this surface **file-backed only** (operating on `sites/<name>/assets/` on disk in dev) or do you want it wired to whatever storage customer sites will use (R2 via the Worker)? DOC-7 §2.2 implies both paths eventually, but starting with file-backed is much cheaper.

Want me to proceed with ticket #1 only (file-backed, no image editing yet), or split differently?


<!-- xgd-turn id="703eba27-f71b-4ece-9b04-c344e53a8811" -->

<!-- xgd-chat role="user" ts="2026-06-16T22:26:25.114Z" -->
#### You
Yes - please reference XGD directly we can copy any code from there that is helpful

<!-- xgd-chat role="assistant" ts="2026-06-16T22:26:25.114Z" -->
#### Claude
Let me draft the scope ticket. First I need to know how this project's `xgd ticket` CLI is invoked here.

Let me peek at the specific TipTap chunks in xgendev-main that we'll adapt for markdown editing.

Let me check the ticket types available and existing builder-layout pattern (we'll mirror it for the asset panel split).

Two scope questions before I write the ticket — these change the implementation shape materially:


<!-- xgd-turn id="628b9230-29ce-4ac2-8546-2f21e87b00b4" -->

<!-- xgd-chat role="user" ts="2026-06-16T22:55:26.310Z" -->
#### You
Sorry this interface does not support the question tool yet, can you ask the questions directly please?

<!-- xgd-chat role="assistant" ts="2026-06-16T22:55:26.310Z" -->
#### Claude
No problem — two scope questions before I write the ticket. Both change the implementation shape materially.

**1. Storage backend**

The control-app is a Cloudflare Worker, so it can't read/write the local FS directly. Options:

- **(a) R2 bucket** *(my recommendation)* — add an `ASSETS_BUCKET` R2 binding to the control-app. Wrangler emulates R2 locally in dev; same code path in production. We seed it once from `sites/1stcontact/assets/` via `wrangler r2 object put`. AssetRefs resolve via a `/assets/<key>` endpoint the Worker already controls.
- **(b) Stay file-backed under `sites/1stcontact/assets/`** — needs a small Node sidecar (or wrangler external script) to serve reads/writes. Wins: assets stay in git alongside the site definition. Costs: a second process to run in dev.
- **(c) Hybrid** — static-asset binding for reads, R2 for writes. Two sources of truth, generally worse. Listed for completeness.

**2. Entry point**

Current builder is `/builder` (chat + preview split). The asset tool can be:

- **(a) New `/assets` route** *(my recommendation)* — standalone HTML shell (`apps/control-app/public/assets.html`) with its own bundle. Cleanest separation; can be opened in its own window. Builder gets a link to it later.
- **(b) View toggle inside `/builder`** — top-level toggle (Builder / Assets) inside the existing shell. Shares state and styles. Slightly more coupling and a small refactor in `builder-ui`.

Which on each — `1a/1b/1c` and `2a/2b`?


<!-- xgd-turn id="fbbfc353-25be-4fe3-ac92-18210f27edd0" -->

<!-- xgd-chat role="user" ts="2026-06-16T23:04:38.614Z" -->
#### You
Wins: assets stay in git alongside the site definition. <-- I thought we decided the site definition was not going to be in git? We were going to store it in R2 I think? R2 sounds like the right answer here. 

Take a look at the conversation in the chat called "Builder" we have just decided on a top level tab navigation structure much like XGD. This asset manager would be one of those tabs. Also note the chat window that we are embedding in every tab.

This is primarily a UI discussion, but I think there is also a versioning question that we should visit. I think we agreed that we're basically going to store snapshots of the site. Anytime you hit publish we store that version in history and can revert to it. That probably means we need a history tab for version management.

<!-- xgd-chat role="assistant" ts="2026-06-16T23:04:38.614Z" -->
#### Claude
Let me read CHAT-9 to catch up on the tab-nav decisions.

Caught up on CHAT-9. The decisions there: tabs `Builder | Settings | Assets | (Revisions | Leads later)`, avatar trigger top-right for the global menu, chat panel per-tab with localStorage persistence (open by default on Builder + Assets). Three reactions and a versioning answer:

**1. R2 confirmed.** Add `ASSETS_BUCKET` binding to control-app. AssetRefs resolve via a Worker-served `/assets/<key>` route. I won't keep blobs in git.

**2. The app shell is a prerequisite that doesn't yet exist.** CHAT-9 enumerated `REQ-UI-APP-SHELL` as the work-to-draft but never created the ticket. The Assets tab can't dock without the shell. Two ways forward:

   - **(a)** Draft `REQ-UI-APP-SHELL` first (tab bar + avatar menu + per-tab chat panel + routing), land it, then this asset REQ slots in cleanly. Cost: one extra ticket cycle before any asset work.
   - **(b)** Draft this asset REQ assuming the shell exists and mark `REQ-UI-APP-SHELL` as a blocking prerequisite. Costs nothing extra if we plan to land the shell next anyway; if we want to ship a working asset surface *before* the shell, we'd need a temporary `/assets` standalone route that we'd then refactor.

   I lean **(a)** — the shell unlocks Settings, Assets, and Revisions all at once, and prevents throwaway standalone-route work. But happy to do **(b)** if you want asset work to start in parallel.

**3. The chat-per-tab embedding is shell-level, not asset-tab-level.** Per CHAT-9 (3), the Assets tab will register a `get_visible_context()` provider exposing the asset list + currently-selected asset + edit state. That's an interface obligation on the asset REQ. The chat panel UI itself belongs to the shell.

**4. Versioning — yes, agreed, but separate REQ.** Sketch:

   - **Trigger**: explicit "Publish" action (no auto-snapshot on edit — too noisy). The current builder mutates a working draft of the site definition; Publish freezes it.
   - **Storage**: R2 keys `revisions/<site>/<iso-timestamp>-<sha>.json` for the snapshot, with a sibling `revisions/<site>/index.json` enumerating versions (timestamp, author, optional message, sha). D1 alternative if we want queryability; R2 is simpler.
   - **Assets in revisions**: open question — do snapshots include asset references only (current model) or copies of asset blobs at that version? Copying R2 blobs per revision is expensive; reference-only means a deleted asset breaks an old revision. Probably reference-only with a soft-delete policy on assets that any revision references. Worth its own design pass.
   - **History tab**: list of revisions, diff view, "Revert to this version" action. Revert is itself a publish of the historical snapshot.
   - **Story points**: probably 5-8 — non-trivial because of the asset-reference question.

   Recommend: new ticket `REQ-PUBLISH-REVISIONS` covering publish action + snapshot storage + History tab. Out of scope for the asset REQ.

**Scope for THIS ticket** (the asset REQ I'll draft once you confirm):

- IN: R2 binding, `/api/assets/{list,get,put,delete}` routes, Assets tab content (file list left, draggable splitter, detail panel right), TipTap markdown/text editing (lazy ESM-loaded, copying `_loadTipTapDeps` pattern from xgendev-main), image preview with metadata, register `get_visible_context()` provider.
- OUT: app shell + tab bar + chat panel (separate REQ), image manipulation (separate REQ), publish + revisions (separate REQ), customer-site asset wiring, AssetRef hookup into modules.

Two calls before I write the ticket:

- **(a)** vs **(b)** on the shell ordering?
- Edit `.md` files via TipTap WYSIWYG with marked→PM→markdown round-trip, or plain textarea with a side preview? Round-trip is the xgendev-main path but markdown serialization from PM has known fidelity issues. Textarea+preview is simpler and exact; WYSIWYG is nicer but riskier in a starter slice.


<!-- xgd-chat-end -->