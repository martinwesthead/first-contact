---
uid: comment-1cca1221
id: COMMENT-109
type: comment
title: Comment on bug BUG-5
created_by: xgd
created_at: '2026-06-19T23:44:30.816656+00:00'
updated_at: '2026-06-19T23:53:40.444020+00:00'
completed_at: null
last_field_updated: body
status: null
fields:
  subject_uid: bug-e3d19fd1
  kind: chat_transcript
---

<!-- xgd-cli-session ts="2026-06-19T23:44:28Z" model="claude-opus-4-7" continued_from="new" -->
*Captured by CLI Claude — paraphrased reconstruction from session memory, not raw capture.*

<!-- xgd-chat role="user" ts="2026-06-19T23:44:28Z" -->
#### You
OK, there are so many things going wrong here I almost don't know where to start.

1. Let's start with the multi pages. When I click on one of the tabs at the top of the panel it takes me to the root page of the site "Hello from app.1stcontact.io".
2. The consent panel does not trigger a response I had to give an explicit consent message
3. I'm still not seeing any pictures

Lets look at those three

<!-- xgd-chat role="assistant" ts="2026-06-19T23:44:28Z" -->
#### Claude
Diagnosis for issue 3 (no images):

**Root cause.** Type mismatch between the LLM context doc and the framework schema.

- **Schema requires an `AssetRef` object** for any image content field. `packages/site-schema/src/schema.ts:24-34`: `AssetRef = z.object({ id, src, alt, focalPoint? })`.
- **Renderer reads `.src` off the object** at `packages/framework/src/render/browser.ts:161` — `const image = content<{ src: string; alt: string }>(instance, "image"); ... <img src="${escapeAttr(image!.src)}" ...`. String value → `.src` undefined → no `<img>` tag.
- **How-to doc instructs the AI to pass a string** at `docs/llm-context/reproducing-a-website.md` (added by REQ-30): "image fields take `/assets/{r2Key}`..." AI follows the doc; the validator either rejects the call or accepts it but renderer can't extract `.src` from a string. Either way, no image.

All upstream layers are healthy: R2 mirror runs, digest is populated with `r2Key`s, control-app `/assets/...` route serves R2. The bug is exclusively at the LLM-instruction layer.

Fix shape: (a) update the how-to doc to instruct the AI to construct `{ id: r2Key, src: "/assets/" + r2Key, alt: altText }` — include a worked example; (b) precompute an `assetRef` field on each `assetInventory` entry in the digest so the AI can drop it in mechanically (`set_module_content({ ..., value: digest.assetInventory[i].assetRef })`). Removes ambiguity, prevents future doc drift from re-introducing the bug. ~1 SP.

<!-- xgd-turn id="e58fcc0f-c840-43ea-a539-4d3208f6e31d-user" -->

<!-- xgd-chat role="user" ts="2026-06-19T23:44:13.330Z" -->
#### You
Please free code a fix for this

<!-- xgd-turn id="e58fcc0f-c840-43ea-a539-4d3208f6e31d-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-19T23:53:40.405Z" -->
#### Claude
Now I have a complete picture. Let me make the changes. First, let me create the TODO list mentally and start implementing.

Now check the index exports for extractor:

Now update the doc:

Now mirror it in the inlined version:

Now let me write the UATs. First the doc-format one:

Now the digest assetRef UAT:

Now I'll write the E2E test:

Now let me run the new tests:

All 6 new UATs pass. Now let me run the regression scope — the related digest/asset/system-prompt tests:

All regression tests pass. Let me also run a wider sweep across the extractor + builder-ui + framework tests since I touched the `transcribe.ts` interface:

All 324 tests pass. Let me also check lint and typecheck:

Now commit:

Tree clean. Now move the ticket to `free_coded`:

Ticket moved to `free_coded`. Now verify state and check the body is still current:

Body still reflects the implementation accurately — the fix matched the plan in the ticket body exactly. Final state:

- **Ticket**: BUG-5 at `status=free_coded`, commit `775351c` recorded in `fields.commits`
- **Commit**: `fix(convert-flow): image fields require AssetRef objects, not strings (BUG-5) [FREE-CODED]`
- **Changes**:
  - `packages/extractor/src/transcribe.ts` — added precomputed `assetRef` field to `TranscriptionDigestAssetEntry`, populated in `buildTranscriptionDigest`
  - `docs/llm-context/reproducing-a-website.md` (+ inlined mirror in `apps/control-app/src/llm-context.ts`) — instructs AI to pass the `assetRef` object, with worked example
  - `packages/extractor/src/index.ts` — exports the new `TranscriptionDigestAssetRef` type
- **Tests**: 3 new UATs (6 cases) pass; regression scope (REQ-28 mirror, REQ-30 digest + system-prompt + killer-demo) green; full suite 324/324 pass

The ticket is parked at `free_coded` — promotion to `ready_to_reconcile` is the operator's call.

<!-- xgd-chat-end -->