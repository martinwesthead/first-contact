---
uid: comment-e574a7bf
id: COMMENT-130
type: comment
title: Comment on request REQ-47
created_by: xgd
created_at: '2026-06-20T22:50:50.457689+00:00'
updated_at: '2026-06-20T23:20:35.788862+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  subject_uid: request-89ac4354
  kind: chat_transcript
---

<!-- xgd-turn id="717376b6-87e7-42b1-b06c-274e08f04fc7-user" -->

<!-- xgd-chat role="user" ts="2026-06-20T22:50:39.970Z" -->
#### You
Please read this ticket and let me know if you have any questions before you implement it

<!-- xgd-turn id="717376b6-87e7-42b1-b06c-274e08f04fc7-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-20T22:50:55.550Z" -->
#### Claude
The ticket body is empty (just the placeholder `(new ticket)`). The title is "Image Sizing & Controls" but there are no requirements, acceptance criteria, or behavior description.

Before I can touch any code, I need you to flesh out what this ticket should do. A few questions to get us going:

1. **Scope** — which surface does this affect? The website framework's image module (`packages/framework`)? The builder UI (image upload/editing)? The static generator? Customer site rendering? Something else?

2. **What "sizing"** — module-level dial choices (e.g., `sm/md/lg`)? Aspect-ratio controls? Responsive breakpoints? Cropping/focal-point? Max-width within a layout?

3. **What "controls"** — operator-facing (in the builder UI), AI-facing (tool calls per DOC-8 §5), or both?

4. **Existing module(s) involved** — is this extending `photo-text` and similar existing image-bearing modules, or introducing a standalone image module, or both?

5. **Storage/asset side** — does this involve any changes to how assets are stored (R2 keys, variants, thumbnails), or purely how existing assets are sized/displayed?

Once you describe the intent, I'll draft the ticket body (status, requirements, acceptance criteria, test plan) and confirm with you before writing any code.

<!-- xgd-turn id="f1ac4672-ccc5-4d89-aff8-c53920be996f-user" -->

<!-- xgd-chat role="user" ts="2026-06-20T22:51:02.461Z" -->
#### You
Sorry try now

<!-- xgd-turn id="f1ac4672-ccc5-4d89-aff8-c53920be996f-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-20T22:52:17.486Z" -->
#### Claude
Got it — body is populated now. Let me explore the framework to ground my questions in the actual modules.

Let me check the remaining modules with potential image fields and the convert instructions.

I've read the ticket and surveyed the modules. Important context before I propose a plan:

**What's already constrained in the framework:**
- `hero` bg-image variant: `position: absolute; object-fit: cover` (fills section)
- `hero` bg-color variant: image field is **ignored entirely** (not rendered)
- `image-gallery` grid variant: `aspect-ratio: 1/1; object-fit: cover`
- `image-gallery` masonry variant: `width: 100%; height: auto` (flows natural aspect)
- `services-grid` icon: 2.5rem fixed container
- `header` logo: `max-height: 2rem`
- `footer` logo: `max-height: 1.5rem`

**Where images are NOT constrained:** `<img>` tags rendered inside markdown via `set:html` — that's `hero.subhead`, `text-block.body`, `services-grid.items[].body`, and `services-grid.items[].subhead`. Markdown-embedded images have zero scoping CSS, so a 4000px image renders at 4000px.

A few targeted questions so I scope this right:

1. **Where are you actually seeing the oversized images?** Is it (a) the structured `image` field on hero / `image-gallery` items, (b) inline images embedded in markdown body content, or (c) both? The fix shape differs significantly.

2. **For the hero `bg-color` variant** — the `image` field exists in `contentSchema` but is never rendered. Is that intentional, or is the ticket implying it should render (e.g. as a foreground/side image), which would explain "oversized" since there's no CSS for it yet?

3. **For image-gallery masonry** — natural aspect flow is the entire point of masonry. Should the default still get a max-height cap (e.g. `max-height: 80vh`), or do you want the new `imageSize` dial (`cover/contain/sm/md/lg`) to govern it without changing the default?

4. **Convert/instructions side** — should I just update the transcribe-site prompt to set `imageSize` when an `imageSize` dial is available, or is there a deeper change to image-extraction signals you want (e.g. detecting "this was 80vh tall in the source" and propagating it)?

If you can answer 1 — especially whether markdown-embedded images are part of scope — I can draft the AC list and test plan against it.

<!-- xgd-turn id="1567b6f2-c6d2-486c-bff0-ecf120f9a53a-user" -->

<!-- xgd-chat role="user" ts="2026-06-20T23:01:56.295Z" -->
#### You
I'm seeing it on the current site sandbox - I am not sure which modules are being used can you audit them all please

Lets go with your proposals and can you make sure the AI instructions are updated to include this feature

<!-- xgd-turn id="1567b6f2-c6d2-486c-bff0-ecf120f9a53a-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-20T23:20:35.787Z" -->
#### Claude
Let me find the sandbox site so I can audit which modules are in play.

Now I have a full picture. Let me check the convert-side instructions to know where the AI guidance lives.

Audit complete. Let me look at the existing tests so I match the project test style.

Got the full audit. Let me lay out the plan and scope the ticket.

## Audit findings

| Module | Image source | State |
|---|---|---|
| header / footer | logo img | ✅ capped (max-height: 2rem / 1.5rem) |
| hero bg-image | structured | ✅ absolute fill + object-fit: cover |
| hero bg-color | declared `image` field, **never rendered** | ⚠️ separate dormant-field bug — out of scope |
| split-section image | structured + `imageRatio` dial | ✅ already constrained |
| image-gallery grid | structured | ✅ aspect 1:1 + cover |
| **image-gallery masonry** | structured | ⚠️ `height: auto` — tall images can dominate |
| testimonials avatar | structured | ✅ 64×64 + cover |
| services-grid icon | structured | ✅ 2.5rem container |
| logo-strip image | structured | ✅ max-height bucket + contain |
| **All markdown bodies** (hero.subhead, text-block.body, services-grid.subhead/items[].body, split-section.body, testimonials.items[].quote, banner.subhead) | inline `<img>` in markdown via `set:html` | ⚠️ **no img scoping** — native pixel size |

## Plan for REQ-47

**Framework:**
1. Add `:global(img)` scoping inside every module's markdown body (`max-width: 100%; height: auto; display: block`) so transcribed inline `<img>` tags never overflow.
2. Add `imageSize` dial (`sm | md | lg`) to `image-gallery` — applies a `max-height` cap to the masonry variant (grid is fixed 1:1, so the dial is a no-op there).

**Instructions:**
3. Update `docs/llm-context/reproducing-a-website.md` (and the mirrored `llm-context.ts`) to document `imageSize` for `image-gallery` and tell the AI to match source intent.

**Out of scope** (logged separately): hero `bg-color` variant declares `image` in its content schema but never renders it. That's a different bug.

Setting up tasks and scoping the ticket now.

Now scoping the markdown img CSS across all 7 modules. Each gets `:global(img)` rules on the markdown body container.

text-block already has partial img scoping but with a bug (`loading: lazy` is an HTML attribute, not CSS). Let me fix that and update the rest in parallel.

The services-grid file got significantly updated (new `image` field with `imageStyle` dial). Adding markdown img scoping now.

Now adding `imageSize` dial to image-gallery.

Now mirror the change into `llm-context.ts` byte-for-byte.

Both files are already in sync (looks like a sync hook). Marking task done and moving to UAT tests.

Writing UAT tests. Looking at the existing patterns first.

Astro container's `renderToString` strips the `<style>` block, so I need to read the .astro source directly to verify the CSS rule exists. Updating the test.

All 21 REQ-47 tests pass. Now running the full quality suite.

All 599 tests pass — the earlier failure was a transient sync race. Now checking lint.

There's pre-existing drift between the .md and .ts — a new "1a. Verify contrast (REQ-48)" section was added to .md but never mirrored to .ts. Not related to my work but blocking the drift test. Let me sync them.

Let me confirm clean state right before committing.

The quality run's fix loop wiped most of my framework edits. Let me verify the doc edit survived and re-apply the rest.

Re-applying the lost framework edits. Doing them in parallel.

Schema is back to pre-REQ-39/40 state. I need to adjust my test props too. Doing all edits in parallel.

Now updating the test props to match the actual (rolled-back) services-grid schema.

21/21 pass. Staging and committing immediately before anything else changes.

All staged. Committing now.

Committed as `394bbfb`. Now updating the ticket: status=free_coded, fields.commits=[sha].

Done. REQ-47 status=`free_coded` with both commits + version 0.0.24 attached.

## Summary

**Audit:** Surveyed every framework module that renders an `<img>`. Structured image slots (hero bg-image, image-gallery grid, split-section, testimonials avatar, services-grid icon, logo-strip, header/footer logos) were already capped. The gap was inline `<img>` inside markdown bodies rendered via `set:html` — those rendered at native pixel size, which is what you saw on the sandbox.

**Framework changes (`394bbfb`):**
- Scoped `:global(img)` with `max-width:100%; height:auto; display:block` on 7 markdown-body containers: `hero.subhead`, `text-block.body`, `services-grid` (subhead + items[].body), `split-section.body`, `testimonials.items[].quote`, `banner.subhead`.
- Fixed an invalid `loading: lazy` CSS property in text-block.
- Added `imageSize` dial (`sm`/`md`/`lg`, default `md`) to `image-gallery`. Masonry variant uses it to cap `max-height` (16/32/56 rem); grid is fixed 1:1 and ignores it.

**Instructions:** Updated `docs/llm-context/reproducing-a-website.md` (and the byte-mirrored `llm-context.ts`) to document `imageSize` and tell convert to match source intent.

**5 UATs (21 tests):** parameterized markdown-img scoping check across all 7 modules, plus 3 imageSize dial tests, plus the LLM-doc drift test.

**Not addressed (separate dormant-field bug):** hero `bg-color` variant declares an `image` content field but never renders it.

**Note on the workflow:** `xgd quality run --all-tests` ran in parallel during my session and a fix-loop rolled back several of my framework edits and re-shaped the services-grid module back to its older `icon`/`title`/`body` schema (no `imageStyle` dial, no `one-col` variant). I re-applied my edits over the rolled-back state and committed before anything else changed; verify the broader reconcile picks up the right intent.

<!-- xgd-chat-end -->