---
uid: comment-b197e3f0
id: COMMENT-121
type: comment
title: Comment on request REQ-39
created_by: xgd
created_at: '2026-06-20T21:12:39.802769+00:00'
updated_at: '2026-06-20T21:12:49.121477+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  subject_uid: request-0c5f4782
  kind: chat_transcript
---

<!-- xgd-turn id="764bea7a-b41e-4b54-9646-37cf310f40ca-user" -->

<!-- xgd-chat role="user" ts="2026-06-20T21:11:37.683Z" -->
#### You
Please read this ticket and let me know if you have questions before implementing

<!-- xgd-turn id="764bea7a-b41e-4b54-9646-37cf310f40ca-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-20T21:12:49.118Z" -->
#### Claude
I've read the ticket and explored the framework's existing modules (hero, text-block, services-grid) to understand the established pattern. The structure is clear, but I have a few clarifying questions before implementing:

## Questions

**1. Required vs optional content fields.** The ticket marks `eyebrow` and `cta` as optional. I'd plan to treat `image`, `heading`, and `body` as **required** (it's the core "image + text" module). Confirm?

**2. Mobile stacking behavior.** Above ~768px the two variants render side-by-side. Below the breakpoint everything has to stack vertically. Two natural choices:
   - **Image always first, then text** (regardless of variant) — simple, predictable, image-as-hook.
   - **Stack order respects variant** — `image-left` stacks image-first; `image-right` stacks text-first.
   
   I'd pick **image-first always** unless you want variant-respecting stacking.

**3. Text alignment dial.** Hero has `align: ["left", "center"]` for inner text. The ticket doesn't list one for split-section. I'd **omit it** (text in a column reads best left-aligned), but worth confirming you don't want one.

**4. Container width.** Hero/services-grid use `--container-default`. I'd follow that.

**5. CTA styling.** I'd reuse the hero CTA visual language (filled primary button) for consistency. OK?

**6. Default dial values.** Reasonable defaults: `size=md`, `spacingTop=12`, `spacingBottom=12`, `surface=default`, `imageRatio=landscape`. OK?

**7. Scope of this ticket.** I'll add the module (`packages/framework/src/modules/split-section/`), register it, export it, and add UATs named `test_UAT_FC_REQ-39_*`. I assume the `[FREE-CODED]` commit + ticket update to `free_coded` is all that's needed — no schema migration or generator changes since module registration is the only integration point. Confirm?

<!-- xgd-chat-end -->