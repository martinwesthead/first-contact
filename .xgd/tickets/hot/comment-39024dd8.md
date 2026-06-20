---
uid: comment-39024dd8
id: COMMENT-122
type: comment
title: Comment on request REQ-40
created_by: xgd
created_at: '2026-06-20T21:13:42.095023+00:00'
updated_at: '2026-06-20T22:56:05.495517+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  subject_uid: request-c8ca3cbc
  kind: chat_transcript
---

<!-- xgd-turn id="36a0352c-8727-4eff-ab0d-31489c8bf3a2-user" -->

<!-- xgd-chat role="user" ts="2026-06-20T21:12:37.078Z" -->
#### You
Please read this ticket and let me know if you have questions before implementing

<!-- xgd-turn id="36a0352c-8727-4eff-ab0d-31489c8bf3a2-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-20T21:13:49.301Z" -->
#### Claude
I've read REQ-40 and walked through the framework module shape (looking at `services-grid` and `text-block` as the closest analogues). Implementation will follow the established pattern: `packages/framework/src/modules/testimonials/{meta.ts, index.astro}`, register in `registry.ts`, export from `index.ts` and `meta.ts`, and write UAT tests in `tests/`.

Before I implement, three small spec questions where the ticket leaves room for choice:

1. **`items[]` min/max bounds.** `services-grid` enforces `min: 2, max: 6`. The ticket doesn't specify for testimonials. Should the `single` variant constrain to exactly 1 item, and `grid` require e.g. `min: 2, max: 9`? Or just leave it open with `min: 1` and let the variant choose how many to render? I'd suggest: `single` ⇒ render only `items[0]` (no enforcement), `grid` ⇒ `min: 2, max: 9`. Open to a simpler "no constraint, render all" if you prefer.

2. **The body says "carousel" but the variants are `single` and `grid`.** I read that as a deliberate v1 choice (no carousel JS — static grid). Confirm? If we ever want a rotating variant, that'd be a v2 dial or a separate `carousel` variant later.

3. **Default `align` value.** Testimonials conventionally center, but the ticket lists `left, center` in that order. Default to `left` (first-listed convention used elsewhere) or `center` (visual convention for testimonials)? I'd lean `center`.

Also two implementation notes I'll just do unless you say otherwise:
- Avatar styled as a circle, ~64px, with `alt` from the AssetRef (matches existing module patterns).
- Quote rendered through `set:html` like other markdown fields (`text-block`, `services-grid` body).

<!-- xgd-turn id="151d954b-3a65-4545-8090-62be8f1f221f-user" -->

<!-- xgd-chat role="user" ts="2026-06-20T22:55:58.443Z" -->
#### You
Lets go with your proposals

<!-- xgd-chat-end -->