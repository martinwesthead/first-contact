---
uid: comment-9241c637
id: COMMENT-12
type: comment
title: Comment on request REQ-12
created_by: xgd
created_at: '2026-06-15T22:45:35.021088+00:00'
updated_at: '2026-06-15T22:45:35.122724+00:00'
completed_at: null
last_field_updated: body
status: null
fields:
  subject_uid: request-580d83d8
  kind: chat_transcript
---

<!-- xgd-cli-session ts="2026-06-15T22:45:31Z" model="claude-opus-4-7" continued_from="new" -->
*Captured by CLI Claude — paraphrased reconstruction from session memory, not raw capture.*

<!-- xgd-chat role="user" ts="2026-06-13T16:00:00.000Z" -->
#### You
no no no. This statement was entirely around preview. You wanted a preview that used the backend generator as a final check in case anything differed. In my mind I think we should go further and do that check in an open browser not an iframe. This also removes a modality issue that might be confusing to the user. So the idea is that there are two preview modes iframe AND full browser. Perhaps we also have a view Life site Button but that is not what I was talking about.

<!-- xgd-chat role="assistant" ts="2026-06-13T16:00:00.000Z" -->
#### Claude
Three surfaces, not two:

1. **In-builder iframe preview** — in-browser render of current draft via `packages/framework`, fast. Right panel of builder. Existing in REQ-8.
2. **Full-browser preview** — real build of current draft via `tools/generate` on the Worker. Same content, but produced end-to-end through the production renderer as a sanity check. New tab — NOT in an iframe (avoids modality confusion).
3. **View live site** (optional, separate) — the actually-published version. Answers "what do users see now?" rather than "does my draft match what production would produce?"

Production-build preview URL shape: a per-session preview URL keeps it separate from the live site, no indexable preview pages.

<!-- xgd-chat role="user" ts="2026-06-13T16:15:00.000Z" -->
#### You
I think we need to make the preview private and only visible to the logged in user, even if it has some hash in the URL it would be awkward if it could be guest or forced

<!-- xgd-chat role="assistant" ts="2026-06-13T16:15:00.000Z" -->
#### Claude
Agreed. Auth-gate it; hash-only fails on forwarded emails, browser history, screen-shares, server logs.

**Option 3 wins** (`app.1stcontact.io/sites/<slug>/preview`). Control-app already has the session; route sits next to the builder; nothing leaks if URL forwarded — recipient hits the login wall.

**Framework rule (proposed for DOC-7):** modules emit relative URLs only. Solves preview navigation (clicking a link stays in the preview, doesn't jump to live site) AND keeps framework deployable to any domain.

**Net for the iframe / preview / live triple:**
- In-builder iframe preview — iframe.contentDocument inside builder, builder session
- Full-browser preview — `app.1stcontact.io/sites/<slug>/preview`, runs tools/generate on draft, builder session
- View live site — `<slug>.1stcontact.io` (or custom domain), public

<!-- xgd-chat role="user" ts="2026-06-13T19:00:00.000Z" -->
#### You
The draft publish ideas are good. Lets talk about the UX?

We need to architect for multi-site, but lets focus on one for now.

<!-- xgd-chat role="assistant" ts="2026-06-13T19:00:00.000Z" -->
#### Claude
**Single-site v1 UX — proposed shape:**

Top bar (left → right):
- Logo / hamburger (nav drawer — empty in v1; future home of sites list, settings, sign-out)
- Site display name
- Draft status pill — three states:
  - "Up to date" (draft == published)
  - "Unpublished changes" (draft ≠ published)
  - "Never published" (no published version yet — only state in trial)
- Right: "View live" link (disabled if never published), "Open preview build" link, "Publish" button (disabled with upsell tooltip in trial), account menu

Below: two-panel chat + iframe preview from DOC-8.

Login landing: root redirects to `/sites/<their-slug>/builder`. Sites-list page exists at `/sites/` but reachable only via hamburger nav. New-site flow deferred.

**Confirmed leans:**
- Site name: display only (rename later)
- Draft/published indicator: top bar pill (single source of state)
- Publish: header only (chat is for content edits; publish is different scope)
- Trial state: disabled Publish with upsell tooltip (discoverability of upgrade path)
- Sign-out: top-right avatar dropdown, minimal

<!-- xgd-chat role="user" ts="2026-06-13T19:20:00.000Z" -->
#### You
All this sounds good - we can tweak it if necessary when I can see it.

<!-- xgd-chat role="user" ts="2026-06-15T14:30:00.000Z" -->
#### You
ok can you create new REQ tickets for where we are?

<!-- xgd-chat role="assistant" ts="2026-06-15T14:30:00.000Z" -->
#### Claude
Created REQ-12 — Builder chrome + lifecycle UI: site header, draft/published pill, publish button, full-browser preview surface, revisions panel.

Story points 5. Depends on REQ-9 (API foundation), REQ-10 (schema), REQ-11 (lifecycle API), REQ-8 (builder shell), REQ-6 (tools/generate).

Key deliverables: BuilderHeader component with logo+nav drawer, site name, three-state pill, view-live (disabled when never-published), open-preview-build, publish button (disabled+upsell on trial), account menu; `/sites/<slug>/preview` Astro route served by control-app that runs tools/generate against draft and returns generated HTML directly with `X-Robots-Tag: noindex`; RevisionsPanel that lists history via list_revisions and triggers rollback; SSE handlers for new event types (action:notify → toast + pill update; state:invalidate → refetch; validation:error → chat display).

Pill computation is a debounced Zustand selector (4Hz max) to avoid flicker during streaming tool calls. Trial-plan tooltip on Publish includes pricing link; View-live hidden entirely on trial (no public URL per lifecycle decision).

<!-- xgd-chat-end -->