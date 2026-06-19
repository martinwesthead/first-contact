---
uid: bug-e3d19fd1
id: BUG-5
type: bug
title: 'Convert flow: how-to doc instructs string image paths but schema requires
  AssetRef'
created_by: xgd
created_at: '2026-06-19T23:43:41.803817+00:00'
updated_at: '2026-06-19T23:53:24.607907+00:00'
completed_at: null
last_field_updated: status
status: free_coded
fields:
  priority: high
  severity: high
  story_points: 1
  auto_merge_back: true
  needs_review: false
  commits:
  - 775351c561ea76c97de03c0dd2e326af57d65a4a
  version: 0.14.1236
---

## Symptom

After running the convert flow against a source site with images (e.g. `https://joyfulculinarycreations.com/`), the converted preview renders **no images at all** — `<img>` tags are either absent from the rendered HTML or have empty `src` attributes. The R2 mirror runs successfully; the digest's `assetInventory[]` is populated with `r2Key`s; the `/api/assets/get/<key>` route works. The chat AI is calling `set_module_content` for image fields. But the image never lands on the page.

This breaks the user's stated demo expectation ("same color same fonts same text, **same images**") and REQ-30's AC9 ("at least one module whose image content field resolves to `/assets/sites/{siteId}/imports/…`").

## Root cause

Type mismatch between the LLM context doc and the framework schema.

- **The schema requires an `AssetRef` object** for any image content field. `packages/site-schema/src/schema.ts:24-34`:
  ```ts
  export const AssetRef = z.object({
    id: z.string().min(1),
    src: z.string().min(1),
    alt: z.string(),
    focalPoint: z.object({ x: z.number(), y: z.number() }).optional(),
  });
  ```
- **The renderer reads `.src` off the object** at `packages/framework/src/render/browser.ts:161` — `const image = content<{ src: string; alt: string }>(instance, "image"); ... <img src="${escapeAttr(image!.src)}" ...`. If `image` is a string, `.src` is undefined and the renderer either omits the tag or emits a broken one.
- **The how-to doc instructs the AI to pass a string** at `docs/llm-context/reproducing-a-website.md` (the convert-flow guidance added by REQ-30): "image fields take `/assets/{r2Key}` where `r2Key` comes from `digest.assetInventory`." The AI follows the doc, calls `set_module_content({ field: "image", value: "/assets/sites/.../abc.jpg" })`, and one of two things happens: (a) the validator rejects the call because `"/assets/..."` is not a valid `AssetRef`, or (b) the validator accepts it (depending on how `set_module_content`'s validator narrows the content schema) and the renderer can't get `.src` off a string. Either way, no image.

All the upstream layers are healthy:

- R2 mirror loop in `apps/control-app/src/operator/transcribe-site.ts` runs and writes assets to `sites/{siteId}/imports/{sha256}.{ext}`.
- Digest JSON written to R2 with populated `assetInventory[]` entries carrying `{ sourceUrl, r2Key, kind, altText? }`.
- `apps/control-app/src/assets/routes.ts:64-71` serves `/api/assets/get/<key>` and `/assets/<key>` from R2.

The bug is exclusively at the LLM-instruction layer.

## Fix

Two changes, both small:

1. **Fix the how-to doc**: `docs/llm-context/reproducing-a-website.md` must tell the AI to construct an `AssetRef` object. Example excerpt the doc should now contain:
   ```
   For each image field, set the value to:
   { id: "<r2Key>", src: "/assets/<r2Key>", alt: "<altText from inventory>" }
   ```
   With at least one worked example so the AI has a model to copy.

2. **Enrich the digest's `assetInventory` so the mapping is mechanical**: add a precomputed `assetRef` field to each `AssetInventoryEntry` containing the exact `{ id, src, alt }` object the AI should drop into `set_module_content`. This removes any ambiguity about how to compose the `id` / `src` / `alt` fields and stops a future doc drift from re-introducing the bug. Extractor change in `packages/extractor/src/transcribe.ts`'s `buildTranscriptionDigest`.

After this fix, the AI's call shape becomes:
```
set_module_content({
  page_id: "home",
  instance_id: "hero-1",
  field: "image",
  value: digest.assetInventory[i].assetRef,  // ready-made object
})
```

## Test plan

UATs in `tests/test_UAT_FC_BUG-XX_*`:

1. **Doc states the AssetRef format**: read the doc file, assert it contains an example matching the AssetRef shape. Catches doc drift.
2. **Digest's assetInventory carries a precomputed assetRef**: `buildTranscriptionDigest(...)` against a fixture with at least one mirrored asset produces an entry whose `assetRef` is a valid `AssetRef` object (validated against the schema).
3. **End-to-end: image renders**: against a fixture with a single image, run the full chat-loop reconstruction (mocked Opus call), and assert the rendered preview HTML contains an `<img src="/assets/sites/.../...">` tag.

Regression scope: REQ-28's mirror UATs (`test_UAT_FC_REQ-28_mirror_asset_to_r2.test.ts` and related) — the mirror loop is unchanged. REQ-30's digest UATs should be updated to assert the new `assetRef` field.