---
uid: comment-cea26c05
id: COMMENT-126
type: comment
title: Comment on request REQ-44
created_by: xgd
created_at: '2026-06-20T21:16:33.203004+00:00'
updated_at: '2026-06-20T23:11:36.384099+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  subject_uid: request-e7328950
  kind: chat_transcript
---

<!-- xgd-turn id="ae00029e-8c12-4b02-8103-eb2eaab2abe1-user" -->

<!-- xgd-chat role="user" ts="2026-06-20T21:16:08.597Z" -->
#### You
Please read this ticket and let me know if you have questions before implementing

<!-- xgd-turn id="ae00029e-8c12-4b02-8103-eb2eaab2abe1-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-20T21:16:48.043Z" -->
#### Claude
I've read the ticket and inspected the existing `services-grid@v1`. Before implementing, I need to clarify a few things — the ticket body and the current v1 don't fully line up, and the upgrade path matters.

## What I found in v1

The current `services-grid@v1` already has:
- **Variants:** `three-col`, `two-col`
- **Dials:** `gap`, `spacingTop`, `spacingBottom`, `surface`
- **Content:** `heading`, `subhead`, `items[]` with `{ icon, title, body, cta }`
  - `icon` is `asset-ref-or-string` (already supports images via AssetRef)
  - `cta` is already present

## Questions before I start

1. **Field renames — `icon` → `image`, `title` → `heading`?** The ticket lists item fields as `image`, `heading`, `body`, `cta`. The v1 has `icon` (asset-ref-or-string) and `title`. Should v2 rename these (breaking change → justifies the version bump), or extend (keep `icon`/`title`, add `image`/`heading` as aliases)? I'd recommend the rename — cleaner contract, and v2 is the place to do it.

2. **`image` semantics vs v1's `icon`.** In v1 `icon` accepts either an emoji string or an AssetRef and is rendered tiny (2.5rem). The ticket's `imageStyle` dial (`icon` / `cover` / `thumb`) implies the new `image` field is asset-ref-only (proper images, sized by the dial). Should v2 drop the emoji-string fallback, or keep `asset-ref-or-string` and have `imageStyle=icon` cover both cases?

3. **Top-level `subhead`.** v1 has it, the ticket doesn't mention it. Drop it in v2, or keep it? I'd keep it — useful and additive doesn't cost much.

4. **`one-col` minimum items.** v1 enforces `min: 2`. With `one-col` for feature callouts, should the minimum drop to 1?

5. **Upgrade vs. parallel version.** Per DOC-7 §8, site definitions pin to a module version, and old versions coexist. Should I:
   - **(a)** Add `services-grid@v2` as a new module alongside v1 (v1 stays for existing sites), or
   - **(b)** Bump v1 in place to v2 (assumes nothing pins to v1 yet)?

   The ticket title says "upgrade existing" — I'd lean (b) since this is pre-launch and the `imageStyle` dial change isn't backwards-compatible — but want to confirm.

6. **Test/transcription/showcase impact.** Do I also need to update any showcase site definitions (e.g. `sites/1stcontact`) or transcription mapping that references the current `icon`/`title` field names? I'll grep, but flagging now in case you know of specific consumers.

My recommended interpretation: rename `icon`→`image` (asset-ref only) and `title`→`heading`; keep `subhead`; add `one-col` variant with `min: 1`; add `imageStyle` dial; bump v1 in place. Want me to proceed on that?

<!-- xgd-turn id="b1bf2951-2707-4a46-a510-b5f724f95eb0-user" -->

<!-- xgd-chat role="user" ts="2026-06-20T22:58:42.744Z" -->
#### You
Lets go with your proposals and can you make sure the AI instructions are updated to include this feature

<!-- xgd-chat-end -->