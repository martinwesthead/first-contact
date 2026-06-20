---
uid: comment-ad5afdba
id: COMMENT-10
type: comment
title: Comment on request REQ-10
created_by: xgd
created_at: '2026-06-15T22:45:26.276076+00:00'
updated_at: '2026-06-20T19:36:11.166785+00:00'
completed_at: null
last_field_updated: body
status: null
fields:
  subject_uid: request-6e7f0ebe
  kind: chat_transcript
---

<!-- xgd-cli-session ts="2026-06-15T22:45:23Z" model="claude-opus-4-7" continued_from="new" -->
*Captured by CLI Claude — paraphrased reconstruction from session memory, not raw capture.*

<!-- xgd-chat role="user" ts="2026-06-13T17:00:00.000Z" -->
#### You
[Earlier context: discussing site builder. User raised:] One thing I would like to adjust in what we discussed... Then we need to discuss
- website staging vs publishing - user has to be able to make these changes, see the results and THEN publish - this feature would be disabled in trial for example
- multiple named websites - single account multiple sites how does the user choose

<!-- xgd-chat role="assistant" ts="2026-06-13T17:00:00.000Z" -->
#### Claude
**Staging vs Publishing proposed model:**

Each site has two states stored in D1:
- Draft — current editing state. Builder always shows this in preview.
- Published — what's live at the public URL. Static build regenerated from this.

Publish action: validator pass → copy draft→published → write revision snapshot → trigger tools/generate → deploy.

Trial gating: Publish button disabled / upsell-styled for trial plans. Trial users edit and preview freely; nothing reaches public URL until they upgrade.

Proposed leans:
- Trial users get any public URL? None — preview-only in the builder.
- Revision granularity? Per-publish, not per-save.
- Rollback? Yes, separate "revert published" action; draft untouched.
- Autosave to D1? Debounced per-tool-call, not per-keystroke.
- Concurrent publish during AI turn? Snapshot draft at publish-click; AI's in-flight changes apply to new draft.

**Multiple Sites Per Account proposed model:**
- users (auth) ↔ accounts (1:1 in v1)
- accounts 1:N sites (slug, draft_definition, published_definition, target_url, plan_features)

UX:
- Sites list at app.1stcontact.io/sites/ on login
- Site picker in builder header dropdown
- Public URLs: <slug>.1stcontact.io auto-subdomain; custom domain later (paid)

Proposed leans:
- Slug uniqueness: global across *.1stcontact.io
- Trial site limit: 1
- Login landing: last-edited if 1 site, sites-list if many
- Site limit per plan: hard-cap per tier with upgrade CTA

Where documented: DOC-5 for both lifecycle and schema/multi-site. DOC-8 for UI sides only.

<!-- xgd-chat role="user" ts="2026-06-13T18:00:00.000Z" -->
#### You
What do you mean by slug?

<!-- xgd-chat role="assistant" ts="2026-06-13T18:00:00.000Z" -->
#### Claude
A slug is a URL-safe short identifier for a site. Examples: `acmecorp`, `my-bakery`, `1stcontact`.

Distinct from:
- Display name (`"Acme Corporation, LLC"`) — for headings, not URLs.
- Internal UUID — opaque, machine-only, FK in D1.
- Domain — the actual public URL.

Same slug threads through: subdomain (`acmecorp.1stcontact.io`), builder path (`app.1stcontact.io/sites/acmecorp/builder`), repo dir for file-backed sites (`sites/1stcontact/`).

Constraints: lowercase letters/digits/hyphens; 3–40 chars; no leading/trailing hyphen; no consecutive hyphens; globally unique across `*.1stcontact.io`; reserved-word list (`api`, `www`, `admin`, `preview`, etc.); collision → rename suggestions.

<!-- xgd-chat role="user" ts="2026-06-13T18:10:00.000Z" -->
#### You
got it. ok. That's fine.

<!-- xgd-chat role="user" ts="2026-06-13T19:00:00.000Z" -->
#### You
The draft publish ideas are good. Lets talk about the UX?

We need to architect for multi-site, but lets focus on one for now.

<!-- xgd-chat role="assistant" ts="2026-06-13T19:00:00.000Z" -->
#### Claude
Lifecycle leans locked. Multi-site bones in data + URL shape, single-site reality in UX.

**Architecting for multi-site without exposing it:**
- URL shape: `app.1stcontact.io/sites/<slug>/builder` (multi-site bones)
- Site definition keyed by slug from day 1 — no "default site" magic
- Database schema (D1) has accounts.id + sites.account_id FK from the start
- Sites-list / new-site / site-picker routes exist as placeholder/empty states

**Schema needs (this REQ's scope):**
- accounts table (id, email, plan_tier)
- sites table (id, account_id FK, slug UNIQUE, display_name, draft_definition JSON, published_definition JSON nullable, published_revision_id, target subdomain)
- revisions table (id, site_id FK, definition snapshot, published_at, published_by, description)
- Slug validation utilities + reserved-slug list
- Seed migration for the 1stcontact site (file → D1; reserved slug, operator-owned)

<!-- xgd-chat role="user" ts="2026-06-15T14:30:00.000Z" -->
#### You
ok can you create new REQ tickets for where we are?

<!-- xgd-chat role="assistant" ts="2026-06-15T14:30:00.000Z" -->
#### Claude
Created REQ-10 — D1 schema: accounts, sites (draft + published), revisions, slug validation, 1stcontact seed.

Story points 3. No dependencies. Foundational for REQ-11 (lifecycle API) and REQ-12 (UI).

Key deliverables: three numbered migrations (accounts, sites with draft/published JSON columns, revisions); reserved-slug list including `1stcontact`; slug validation utilities (`isValidSlug`, `isReservedSlug`, `suggestAlternativeSlug`); seed migration that bootstraps the 1stcontact site row from `sites/1stcontact/site.json` so D1-backed and file-backed paths converge.

Multi-site bones (accounts → sites 1:N) baked into schema even though v1 UX only exposes the single-site case.

<!-- xgd-turn id="b8afad99-674b-4742-af39-eadb3ac08bcf-user" -->

<!-- xgd-chat role="user" ts="2026-06-20T19:35:59.394Z" -->
#### You
Please free code a fix for this?

<!-- xgd-chat-end -->