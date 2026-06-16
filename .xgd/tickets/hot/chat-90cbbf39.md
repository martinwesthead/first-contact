---
uid: chat-90cbbf39
id: CHAT-14
type: chat
title: Asset manager
created_by: xgd
created_at: '2026-06-16T22:01:48.004010+00:00'
updated_at: '2026-06-16T22:26:25.176245+00:00'
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


<!-- xgd-chat-end -->