---
uid: request-82f571d1
id: REQ-16
type: request
title: 'Assets tab: TipTap WYSIWYG markdown editor and image preview'
created_by: xgd
created_at: '2026-06-16T23:14:45.765175+00:00'
updated_at: '2026-06-18T22:07:36.909461+00:00'
completed_at: null
last_field_updated: story_points
status: draft
fields:
  story_points: 3
  priority: medium
  auto_merge_back: true
  needs_review: false
---

# Assets tab: TipTap WYSIWYG markdown editor and image preview

## Problem

Operators need a place to manage non-module content for a site: markdown docs (READMEs, guides, copy snippets), text files (robots.txt, config), and images. Today there is no UI — `sites/<site>/assets/` exists but is shell-edited only. We need an in-builder surface that lists assets, allows WYSIWYG editing of text/markdown, and previews images.

The R2 storage plumbing (bucket binding + four CRUD routes) was originally inside this REQ; it has moved into [[REQ-20]] so the demo critical path (REQ-21 → REQ-22 → REQ-28) can land without dragging the editor UI along. This REQ is now **UI only** and consumes the routes provided by REQ-20.

## Decisions already made

- **Storage**: provided by [[REQ-20]] — `ASSETS_BUCKET` binding on the control-app, served via `GET /assets/<key>`, listed via `GET /api/assets/list`, mutated via `PUT /api/assets/put/<key>` and `DELETE /api/assets/delete/<key>`. This REQ consumes those routes; it does not define them.
- **Surface**: Assets tab inside the new app shell (per CHAT-9: `Builder | Settings | Assets | Revisions | Leads` tab bar, avatar menu top-right, chat panel per tab). This REQ contributes the Assets tab **content** only — not the shell.
- **Editor**: WYSIWYG TipTap, markdown round-trip via `marked()` for load and a custom HTML→markdown serializer for save. **All editor code copied from xgendev-main `xgd_source/dashboard/static/index.html`**:
  - Lazy ESM loader: `_loadTipTapDeps()` (~lines 8634–8676)
  - Editor mount pattern: from `loadIntentBodyIntoEditor` (~line 8680), simplified — strip all diff/proposal machinery
  - Markdown serializer: `htmlToMarkdown(html)` (~line 9662)
  - Toolbar command wiring: ~lines 9095–9104 (`data-format` dispatcher + chain commands for bold / italic / h1-h3 / bullet-list / ordered-list)
  - Toolbar CSS: from `#doc-editor-toolbar button[data-format]` block (~lines 1049–1067)
  - Extensions: StarterKit + Placeholder + Table + TableRow + TableHeader + TableCell
- **Image preview**: detail panel renders `<img src="/assets/<key>">` with a metadata sidecar (filename, content-type, KB, natural dimensions). No editing in this REQ.

## Scope

### IN

- Assets tab UI in `packages/builder-ui/src/components/`:
  - New `createAssetsTab(parent, options)` factory. Assumes parent is the content area provided by the app shell. Until the shell lands, mount it via a stub host route `/assets` in control-app (delete the stub host when REQ-UI-APP-SHELL lands).
  - Internal layout: reuse the `builder-layout.ts` splitter pattern. Generalize the names (`chatPanel`/`previewPanel` → `leftPanel`/`rightPanel`) into a `createSplitLayout` helper, then have `builder-layout` consume it. Persisted width in `localStorage` under `1stcontact_assets_panel_v1`.
  - Left panel: scrollable file list (fed by `GET /api/assets/list`). Each row = filename + type icon (`.md`/`.txt`/image/other). "Upload" button at top accepting `<input type="file" multiple>` that PUTs to `/api/assets/put/<key>`. Per-row delete affordance with confirm that calls `DELETE /api/assets/delete/<key>`.
  - Right panel: dispatch by content-type —
    - `text/markdown`, `text/plain`, `text/*` → TipTap WYSIWYG editor (toolbar above, mount below). Loads via `GET /assets/<key>`, saves via `PUT /api/assets/put/<key>`.
    - `image/*` → `<img>` preview + metadata block.
    - Other → "No preview" with download link.
  - Dirty tracking via HTML-vs-saved-baseline compare (same pattern as xgendev-main `intentEditor` — single comparison, no per-keystroke serialization).
  - Save button disabled when clean, enabled when dirty.
- `get_visible_context()` provider hook: the tab exposes `getVisibleContext()` returning `{tab: "assets", assetList, selectedAssetKey, selectedContentType, isEditorDirty}`. Concrete wire-up to the chat tool waits for REQ-CHAT-CONTEXT.

### OUT (explicitly deferred)

- **R2 plumbing** (bucket binding + 4 CRUD routes) → moved to [[REQ-20]].
- App shell (tab bar, avatar menu, chat panel embedding, per-tab routing, per-tab chat persistence) → **blocking prerequisite**, see Dependencies.
- Image manipulation (crop, rotate, format convert) → follow-up REQ ([[REQ-19]]).
- Publish + revisions / History tab → separate REQ ([[REQ-18]]).
- AssetRef wiring into modules from inside Builder ("pick an asset" UX) → site-schema already covers the type; no UI in this REQ.
- Per-customer-site asset isolation (multi-tenancy on the bucket) → assume single site for v1; revisit when auth lands.
- Asset search, tags, folders.
- Chat panel UI in this tab → shell-level.

## Dependencies

- **Blocking prerequisite**: [[REQ-20]] — provides `ASSETS_BUCKET` binding and the four CRUD routes this UI consumes.
- **Blocking prerequisite**: `REQ-UI-APP-SHELL` (not yet drafted) provides the tab bar, the tab's parent content area, and the per-tab chat panel slot. This REQ can be developed against a stub host route under `/assets` until the shell lands; the stub goes away in the shell REQ.
- `REQ-CHAT-CONTEXT` (not yet drafted) defines the `get_visible_context()` interface. This REQ exposes a `getVisibleContext()` callback the shell will wire up.

## Acceptance criteria

1. Operator visits the Assets surface and sees a list of every R2 object in `ASSETS_BUCKET` sorted by key (via `GET /api/assets/list`).
2. Splitter drag resizes left vs right panel; width persists across reloads via `localStorage`.
3. Selecting a `.md` row mounts the TipTap editor with rendered markdown (headings, bold, italic, lists, tables visible as their rendered forms).
4. Toolbar buttons (bold, italic, h1, h2, h3, bullet-list, ordered-list) toggle the corresponding marks/blocks on selection.
5. Save button is disabled when editor HTML matches last-saved baseline; enabled when dirty.
6. Save serializes editor HTML via `htmlToMarkdown()`, `PUT`s to `/api/assets/put/<key>` with the file's original content-type, and clears the dirty flag on success.
7. Selecting an image row renders an `<img>` preview plus metadata sidecar (content-type, KB, natural width × height). No editor mounts.
8. Upload button uploads selected file(s) via `PUT /api/assets/put/<key>` with their original content-type; list refreshes; new items appear.
9. Delete button removes the file via `DELETE /api/assets/delete/<key>` after confirmation; list refreshes; subsequent `GET /assets/<key>` returns 404.
10. Concurrent-edit conflict surfaced from REQ-20's `If-Match` enforcement: PUT returns 412; UI surfaces "file changed elsewhere — reload?" prompt.

## Story points

3. UI scaffolding + WYSIWYG editor copy + image preview + dirty tracking + conflict-surface UX. (Was 5 before R2 plumbing moved to REQ-20.)

## Test plan (UAT-primary, per `TEST-STRATEGY.md`)

Tests named `test_UAT_FC_<TICKET-ID>_*.ts`, under `tests/`. Stack: vitest + Miniflare (matches existing `vitest.config.mts`). Tests use the R2 routes delivered by REQ-20 — they do not re-test the routes themselves.

- `test_UAT_FC_<TICKET-ID>_list_and_select.ts` — upload a fixture `.md` via the REQ-20 PUT route, see it in the list, click it, editor mounts with rendered markdown.
- `test_UAT_FC_<TICKET-ID>_edit_and_save.ts` — open `.md`, toggle bold via toolbar, save, reload page, bold survives the markdown round-trip.
- `test_UAT_FC_<TICKET-ID>_image_preview.ts` — upload PNG, select it, see `<img>` preview + correct metadata.
- `test_UAT_FC_<TICKET-ID>_delete.ts` — delete asset, confirm, list refreshes, `GET /assets/<key>` returns 404.
- `test_UAT_FC_<TICKET-ID>_splitter_persist.ts` — drag splitter, reload, width restored.
- `test_UAT_FC_<TICKET-ID>_etag_conflict.ts` — simulate concurrent update via direct R2 write; PUT returns 412; UI shows reload prompt.

## Notes for implementer

- The xgendev-main editor code uses `https://esm.sh/...` imports — keep that pattern. Don't pull TipTap into the bundle via npm — the lazy CDN load keeps the builder bundle small.
- `htmlToMarkdown` in xgendev-main is hand-rolled to match the subset of HTML that StarterKit + Tables produces. It handles bold, italic, headings, lists, code, tables, links. Copy it whole — do not replace with `turndown` or similar.
- Strip the diff/proposal extensions when copying the editor setup. Asset editing has no diff workflow.
- The toolbar CSS in xgendev-main targets `#doc-editor-toolbar` / `#intent-editor-toolbar`. Rename to `.fc-asset-editor-toolbar` to match the `fc-` prefix used throughout `apps/control-app/public/builder.html`.


## Design discussion — excerpts from session 2026-06-16

The transcript below covers the design decisions baked into the scope above. Useful when picking the work up in a fresh session — it documents *why* each choice was made, not just *what* the choice was.

### Original ask

> **User:** I think there is a need for an asset management tool. It would have a file space listed on the left-hand side, a movable panel separator and on the right panel there would be a detailed view/editor. I think we would mostly be accommodating text and markdown files which could be edited. We should also accommodate the inclusion of images. I think we need to be able to do some very very basic image manipulation, cropping, perhaps converting into different formats rotation – that's probably enough to get us started. For the editor please look at the editors in ../xgendev-main where we use tiptap

### Scope split

> **Assistant:** This is too big for one free-coded ticket. I'd suggest splitting into two tickets:
> 1. **Asset browser + text/markdown editor** — left file list, draggable splitter, right-side TipTap editor for `.md`/`.txt` files, image files render as previews (no editing). This is the panel + editor scaffolding.
> 2. **Image manipulation** — crop / rotate / format convert (PNG↔JPEG↔WebP). Built on top of (1) once the asset detail panel exists.
>
> One open question that affects scope shape: is this surface file-backed only (operating on `sites/<name>/assets/` on disk in dev) or do you want it wired to whatever storage customer sites will use (R2 via the Worker)?

This REQ is slice 1. Slice 2 is [[REQ-19]] (image manipulation).

### Storage decision — R2

> **User (replying to a misframing that file-backed kept assets in git):** I thought we decided the site definition was not going to be in git? We were going to store it in R2 I think? R2 sounds like the right answer here.

Settled: R2 binding `ASSETS_BUCKET` on the control-app. Wrangler emulates locally in dev. Same code in production. The site definition itself also lives in R2 (relevant for [[REQ-18]]).

The R2 binding and CRUD routes were originally inside this REQ; in the 2026-06-18 planning chat we moved them into [[REQ-20]] so the demo critical path could land without the assets-tab UI.

### Surface — Assets tab in the new app shell

> **User:** Take a look at the conversation in the chat called "Builder" we have just decided on a top level tab navigation structure much like XGD. This asset manager would be one of those tabs. Also note the chat window that we are embedding in every tab.

From CHAT-9, the app shell decisions: top-bar tabs `Builder | Settings | Assets | (Revisions | Leads later)`, top-right avatar menu, chat panel per tab with `localStorage` persist, defaults open on Builder + Assets.

The shell itself is a blocking prerequisite — see **REQ-UI-APP-SHELL**. This REQ contributes the Assets tab content only; the chat panel UI and tab bar live in the shell REQ.

### Editor — WYSIWYG TipTap, copy from XGD

> **Assistant (offering a fallback to plain textarea):** Edit `.md` files via TipTap WYSIWYG with marked→PM→markdown round-trip, or plain textarea with a side preview? Round-trip is the xgendev-main path but markdown serialization from PM has known fidelity issues. Textarea+preview is simpler and exact; WYSIWYG is nicer but riskier in a starter slice.
>
> **User:** Unfortunately it has to be WYSIWYG or nothing for our user base. Could you just copy the code from XGD? It does everything we need.

Settled: WYSIWYG. Copy verbatim from `xgd_source/dashboard/static/index.html` in `../xgendev-main`. Specific copy targets (with approximate line numbers as of 2026-06-16) are listed in the **Decisions already made** section above.

### Versioning — separate REQ

> **User:** This is primarily a UI discussion, but I think there is also a versioning question that we should visit. I think we agreed that we're basically going to store snapshots of the site. Anytime you hit publish we store that version in history and can revert to it. That probably means we need a history tab for version management.

Settled out of this REQ — see [[REQ-18]]. The cross-reference matters for the assets DELETE handler: that REQ adds a soft-block when an asset is referenced by any revision.

### Image manipulation — follow-up REQ

Image crop / rotate / format-convert is out of scope here. See [[REQ-19]].
