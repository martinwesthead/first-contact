---
uid: request-82f571d1
id: REQ-16
type: request
title: 'Assets tab: R2-backed asset browser with TipTap WYSIWYG markdown editor and
  image preview'
created_by: xgd
created_at: '2026-06-16T23:14:45.765175+00:00'
updated_at: '2026-06-16T23:14:45.765175+00:00'
completed_at: null
last_field_updated: created_at
status: draft
fields:
  story_points: 5
  priority: medium
  auto_merge_back: true
  needs_review: false
---

# Assets tab: R2-backed asset browser with TipTap WYSIWYG markdown editor and image preview

## Problem

Operators need a place to manage non-module content for a site: markdown docs (READMEs, guides, copy snippets), text files (robots.txt, config), and images. Today there is no UI — `sites/<site>/assets/` exists but is shell-edited only. We need an in-builder surface that lists assets, allows WYSIWYG editing of text/markdown, and previews images.

## Decisions already made

- **Storage**: R2 bucket `ASSETS_BUCKET` bound to the control-app Worker. Wrangler emulates R2 locally in dev (state in `.wrangler/state/`); production binds to the real bucket. AssetRefs (per `packages/site-schema/src/schema.ts`) resolve via Worker route `GET /assets/<key>`.
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

- Add `[[r2_buckets]]` binding `ASSETS_BUCKET` to `apps/control-app/wrangler.toml` (top-level + `[env.production]`).
- Worker routes on control-app (`apps/control-app/src/`):
  - `GET /api/assets/list` → JSON `{items: [{key, size, etag, uploaded, contentType}]}`.
  - `GET /assets/<key>` → object body, preserving original content-type. Also serves AssetRefs for customer sites later.
  - `PUT /api/assets/put/<key>` → upload/overwrite. Body = raw file bytes; uses `Content-Type` header. Optional `If-Match: <etag>` for concurrency.
  - `DELETE /api/assets/delete/<key>` → remove object.
- Assets tab UI in `packages/builder-ui/src/components/`:
  - New `createAssetsTab(parent, options)` factory. Assumes parent is the content area provided by the app shell. Until the shell lands, mount it via a stub host route `/assets` in control-app (delete the stub host when REQ-UI-APP-SHELL lands).
  - Internal layout: reuse the `builder-layout.ts` splitter pattern. Generalize the names (`chatPanel`/`previewPanel` → `leftPanel`/`rightPanel`) into a `createSplitLayout` helper, then have `builder-layout` consume it. Persisted width in `localStorage` under `1stcontact_assets_panel_v1`.
  - Left panel: scrollable file list. Each row = filename + type icon (`.md`/`.txt`/image/other). "Upload" button at top accepting `<input type="file" multiple>`. Per-row delete affordance with confirm.
  - Right panel: dispatch by content-type —
    - `text/markdown`, `text/plain`, `text/*` → TipTap WYSIWYG editor (toolbar above, mount below).
    - `image/*` → `<img>` preview + metadata block.
    - Other → "No preview" with download link.
  - Dirty tracking via HTML-vs-saved-baseline compare (same pattern as xgendev-main `intentEditor` — single comparison, no per-keystroke serialization).
  - Save button disabled when clean, enabled when dirty.
- `get_visible_context()` provider hook: the tab exposes `getVisibleContext()` returning `{tab: "assets", assetList, selectedAssetKey, selectedContentType, isEditorDirty}`. Concrete wire-up to the chat tool waits for REQ-CHAT-CONTEXT.

### OUT (explicitly deferred)

- App shell (tab bar, avatar menu, chat panel embedding, per-tab routing, per-tab chat persistence) → **blocking prerequisite**, see Dependencies.
- Image manipulation (crop, rotate, format convert) → follow-up REQ.
- Publish + revisions / History tab → separate REQ.
- AssetRef wiring into modules from inside Builder ("pick an asset" UX) → site-schema already covers the type; no UI in this REQ.
- Per-customer-site asset isolation (multi-tenancy on the bucket) → assume single site for v1; revisit when auth lands.
- Asset search, tags, folders.
- Chat panel UI in this tab → shell-level.

## Dependencies

- **Blocking prerequisite**: `REQ-UI-APP-SHELL` (not yet drafted) provides the tab bar, the tab's parent content area, and the per-tab chat panel slot. This REQ can be developed against a stub host route under `/assets` until the shell lands; the stub goes away in the shell REQ.
- `REQ-CHAT-CONTEXT` (not yet drafted) defines the `get_visible_context()` interface. This REQ exposes a `getVisibleContext()` callback the shell will wire up.

## Acceptance criteria

1. Operator visits the Assets surface and sees a list of every R2 object in `ASSETS_BUCKET` sorted by key.
2. Splitter drag resizes left vs right panel; width persists across reloads via `localStorage`.
3. Selecting a `.md` row mounts the TipTap editor with rendered markdown (headings, bold, italic, lists, tables visible as their rendered forms).
4. Toolbar buttons (bold, italic, h1, h2, h3, bullet-list, ordered-list) toggle the corresponding marks/blocks on selection.
5. Save button is disabled when editor HTML matches last-saved baseline; enabled when dirty.
6. Save serializes editor HTML via `htmlToMarkdown()`, `PUT`s to `/api/assets/put/<key>` with the file's original content-type, and clears the dirty flag on success.
7. Selecting an image row renders an `<img>` preview plus metadata sidecar (content-type, KB, natural width × height). No editor mounts.
8. Upload button uploads selected file(s) to R2 with their original content-type; list refreshes; new items appear.
9. Delete button removes the file from R2 after confirmation; list refreshes; subsequent `GET /assets/<key>` returns 404.
10. Concurrent-edit conflict: PUT with stale `If-Match` returns 412; UI surfaces "file changed elsewhere — reload?" prompt.

## Story points

5. R2 plumbing + UI scaffolding + WYSIWYG editor copy + image preview + dirty tracking + conflict path.

## Test plan (UAT-primary, per `TEST-STRATEGY.md`)

Tests named `test_UAT_FC_<TICKET-ID>_*.ts`, under `tests/`. Stack: vitest + Miniflare (matches existing `vitest.config.mts`). R2 binding tested via Miniflare's local R2 emulator.

- `test_UAT_FC_<TICKET-ID>_list_and_select.ts` — upload a fixture `.md`, see it in the list, click it, editor mounts with rendered markdown.
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
