---
uid: request-c3a55051
id: REQ-19
type: request
title: 'Assets tab: basic image manipulation (crop, rotate, format convert)'
created_by: xgd
created_at: '2026-06-16T23:20:32.786808+00:00'
updated_at: '2026-06-16T23:20:32.786808+00:00'
completed_at: null
last_field_updated: created_at
status: draft
fields:
  story_points: 5
  priority: medium
  auto_merge_back: true
  needs_review: false
---

# Assets tab: basic image manipulation (crop, rotate, format convert)

## Problem

Operators uploading images into the Assets tab (REQ-16) often need lightweight edits — crop to remove dead margin, rotate a sideways photo, convert PNG to JPEG to shrink filesize. Today there is no in-builder image editor; operators have to round-trip to external tools.

Per the original design ask: "very very basic image manipulation, cropping, perhaps converting into different formats, rotation — that's probably enough to get us started." Keeping scope tight to those three operations.

## Decisions

- **Operations**: crop (rectangle), rotate (90° increments), format convert (PNG / JPEG / WebP).
- **Mechanism**: browser-side canvas. No server-side image processing. Image loaded into `<canvas>`, edits applied via 2D context, exported via `canvas.toBlob`.
- **Library**: vanilla canvas for rotate and format convert; **Cropper.js** (lazy-loaded from esm.sh, same pattern as TipTap in REQ-16) for the crop UI. Hand-rolling crop UX is more code than it's worth.
- **Save model**: two buttons — **Save** (overwrites the asset at the same key, content-type may change to match new format) and **Save as new** (prompts for new filename, PUTs to a new key). Format-conversion strongly suggests **Save as new** by default (so you keep the original); UI nudges toward it.
- **No undo / history** in v1. Cancel discards. Once saved, the original is gone unless you used Save as new.

## Scope

### IN

- Editor UI in the Assets tab right-panel, available when an `image/*` row is selected:
  - Toolbar: `Crop | Rotate ↻ | Format ▾ | Reset | Save | Save as new | Cancel`.
  - Crop tool: click activates Cropper.js. Operator drags a rectangle; "Apply" applies the crop to the working canvas, "Cancel" exits crop mode.
  - Rotate: each click rotates 90° clockwise. Multiple clicks compose. Updates the working canvas dimensions accordingly.
  - Format dropdown: `Keep | PNG | JPEG | WebP`. Selecting a non-`Keep` value re-encodes on save. For JPEG/WebP, a quality slider appears (default 0.9).
  - Reset: discard all pending edits, reload the original image into the canvas.
  - Save: `canvas.toBlob` → `PUT /api/assets/put/<key>` with the new content-type. If format changed, the asset's content-type updates; filename extension is updated automatically (e.g. `foo.png` → `foo.jpg`); UI surfaces the rename. Optionally renames the underlying R2 key (DELETE + PUT, or `If-Match` PUT to new key) to keep extension and content-type aligned.
  - Save as new: prompts for filename (pre-filled with `<basename>-edited.<ext>`), PUTs to new key, list refreshes.
  - Cancel: discard pending edits, return to image preview mode.
- Worker route: no new routes — existing `/api/assets/put/<key>` from REQ-16 covers writes. Rename-on-format-change uses PUT-new + DELETE-old.
- Dirty tracking on the editor canvas (any pending crop/rotate/format change = dirty).

### OUT

- **Resize to arbitrary dimensions** — user said "very very basic"; resize adds slider UX and aspect-ratio decisions beyond the scope cap.
- **Filters / colour adjustments / brightness / contrast** — Photoshop-lite drift.
- **Multi-image batch operations** — single-asset editing only.
- **Server-side image processing** — keeps the Worker simple; client canvas handles everything.
- **EXIF preservation** — `canvas.toBlob` strips EXIF; we accept that. Add back via dedicated REQ if needed.
- **Animated GIF / video editing** — operate on the first frame; warn operator.
- **Undo / redo history**.

## Dependencies

- **Blocking**: **REQ-16** (Assets tab) — this REQ adds toolbar + canvas editor to the right panel's image preview.

## Acceptance criteria

1. Selecting an `image/*` row shows the preview plus the toolbar (`Crop | Rotate | Format | Reset | Save | Save as new | Cancel`).
2. Clicking Crop activates the Cropper.js overlay; dragging selects a region; Apply applies the crop to the working canvas.
3. Clicking Rotate rotates the working canvas 90° clockwise; the preview reflects the new orientation. Multiple clicks compose (180°, 270°, back to 0°).
4. Format dropdown lists Keep / PNG / JPEG / WebP. Selecting JPEG or WebP shows a quality slider.
5. Save overwrites the asset; new content-type and renamed key (extension updated) take effect; list refreshes with the new entry.
6. Save as new prompts for a filename, PUTs to a new key with the same content; list shows both the original and the new asset.
7. Reset discards all pending edits and restores the original image.
8. Cancel exits edit mode without saving; preview returns to the unedited image.
9. The editor canvas dirty flag enables Save / Save as new only when there are pending edits.
10. Converting PNG → JPEG correctly fills the alpha background with white (or a configurable colour) so transparency does not show as black.

## Story points

5. Cropper.js integration + canvas rotate + format export + save flows + dirty tracking.

## Test plan

UAT tests `test_UAT_FC_<TICKET-ID>_*.ts`. Vitest + Miniflare for the PUT routes; jsdom + canvas polyfill for the editor.

- `_crop_apply.ts` — load fixture image, apply crop region, Save, GET back shows cropped dimensions.
- `_rotate_90.ts` — rotate once, Save, dimensions swapped (W↔H).
- `_rotate_compose.ts` — rotate 4× returns to original orientation.
- `_format_convert_png_to_jpeg.ts` — load PNG, format → JPEG quality 0.9, Save, new asset is `image/jpeg`, key extension renamed.
- `_save_as_new.ts` — edit + Save as new, original untouched, new key present.
- `_reset_discards.ts` — apply edits, Reset, canvas back to original.
- `_dirty_flag.ts` — Save and Save-as-new disabled until first edit.

## Design discussion — excerpts from session 2026-06-16

> **User:** I think we need to be able to do some very very basic image manipulation, cropping, perhaps converting into different formats rotation – that's probably enough to get us started.

> **Assistant:** Recommendation before I touch anything: This is too big for one free-coded ticket. The full ask crosses ~4 separable concerns and likely 15+ story points. I'd suggest splitting into two tickets:
> 1. Asset browser + text/markdown editor — left file list, draggable splitter, right-side TipTap editor for `.md`/`.txt` files in sites/1stcontact/assets/, image files render as previews (no editing).
> 2. **Image manipulation** — crop / rotate / format convert (PNG↔JPEG↔WebP). Built on top of (1) once the asset detail panel exists.

> **User:** Yes — please reference XGD directly we can copy any code from there that is helpful

This REQ is the second slice. XGD does not have a comparable image editor to copy from, so Cropper.js (or equivalent) is pulled fresh via the same lazy ESM pattern used for TipTap in REQ-16.
