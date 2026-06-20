---
uid: comment-e574a7bf
id: COMMENT-130
type: comment
title: Comment on request REQ-47
created_by: xgd
created_at: '2026-06-20T22:50:50.457689+00:00'
updated_at: '2026-06-20T23:11:37.096717+00:00'
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

<!-- xgd-chat-end -->