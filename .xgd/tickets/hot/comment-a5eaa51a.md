---
uid: comment-a5eaa51a
id: COMMENT-124
type: comment
title: Comment on request REQ-42
created_by: xgd
created_at: '2026-06-20T21:14:37.217897+00:00'
updated_at: '2026-06-20T21:15:53.147625+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  subject_uid: request-e220320e
  kind: chat_transcript
---

<!-- xgd-turn id="4ec5ac14-84a2-4078-81cc-4a9157531171-user" -->

<!-- xgd-chat role="user" ts="2026-06-20T21:14:23.308Z" -->
#### You
Please read this ticket and let me know if you have questions before implementing

<!-- xgd-turn id="4ec5ac14-84a2-4078-81cc-4a9157531171-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-20T21:15:53.115Z" -->
#### Claude
Let me explore the codebase to understand existing module conventions before asking questions.

I've read the ticket and surveyed the codebase. I understand the shape — this is a new module following the same pattern as `hero` and `text-block` (meta.ts + index.astro under `packages/framework/src/modules/banner/`, with touchpoints in `registry.ts`, `index.ts`, `meta.ts`, browser markdown.ts, and `packages/builder-ui/src/catalog.ts`).

A few questions before I scope the work:

1. **`subhead` type — string or markdown?** The spec literally says `string`, but the analogous field on `hero` is `markdown`. Recommend `markdown` for consistency (operators tend to want a link or **bold** in a subhead).

2. **CTA + variant semantics.** The spec lists `with-cta` as a variant and `cta` as an optional content field. Two readings:
   - **(a) Variant is purely visual styling**, CTA renders whenever it's present regardless of variant. (`simple` would just be the typical case where no CTA was provided.)
   - **(b) Variant gates rendering** — `simple` hides any CTA even if provided; `with-cta` requires a CTA. If no CTA on `with-cta`, render nothing or fall back.
   
   Recommend (a) — variant controls visual treatment (e.g. inline CTA vs. CTA-as-button), CTA renders iff present. Variants can differ visually beyond just CTA presence.

3. **Default spacing.** Hero defaults to `12/12`, text-block to `8/8`. For an announcement-strip banner I'd default to `6/6` so it sits between sections without dominating. OK?

4. **Touchpoints I'll update** (just confirming nothing surprising):
   - `packages/framework/src/modules/banner/{meta.ts,index.astro}` (new)
   - `packages/framework/src/modules/registry.ts` (add to REGISTRY)
   - `packages/framework/src/modules/index.ts` (export meta + component)
   - `packages/framework/src/modules/meta.ts` (browser-safe meta re-export)
   - `packages/framework/src/render/markdown.ts` (add to `METAS_BY_ID`)
   - `packages/builder-ui/src/catalog.ts` (add `bannerMeta` to `ALL`)
   - New UATs under `tests/test_UAT_FC_REQ-42_*.test.ts`

Want me to proceed with (1) markdown, (2) variant-as-visual, (3) 6/6 defaults — or tweak any of these?

<!-- xgd-chat-end -->