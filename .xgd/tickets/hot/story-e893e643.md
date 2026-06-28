---
uid: story-e893e643
id: STORY-60
type: story
title: 'AI editing tool surface: page management, nav editing, page metadata, and
  module duplication'
created_by: xgd
created_at: '2026-06-28T20:47:07.071919+00:00'
updated_at: '2026-06-28T23:54:45.792090+00:00'
completed_at: null
last_field_updated: status
status: updated
fields:
  intent_uid: bundle-24c4d23c
  capability_uid: capability-6694c60f
  story_kind: upgrade
  story_points: 2
---

## Story
**As an** operator reconstructing or editing a site through the builder chat, **I want** the AI assistant to manage pages, edit navigation, patch page metadata, and duplicate modules, **so that** I can build and maintain multi-page sites entirely through chat without falling back to manual UI affordances.

## Description
This story documents the AI's site-editing tool surface for structural edits, alongside the existing module, theme-token, and site-config editing tools. The assistant has the following structural state-editing tools.

**Page management:**
- **add_page** — insert a new, empty page given a bare `slug` (e.g. `menu`, stored canonically as `/menu`) and a `title`. An optional `after_slug` controls placement; without it the page is appended last. New pages start with no modules.
- **remove_page** — delete a page by its slug. The site must always retain at least one page. Nav entries pointing at the removed page are stripped at the same time.
- **reorder_pages** — set the full page order by supplying every existing page slug exactly once.

**Navigation editing:**
- **set_nav_pattern** — set `site.nav.pattern` to one of the allowed patterns (`in-page-anchors`, `top-tabs`, `top-tabs-dropdown`, `hamburger`, `footer-only`). Unknown values are rejected. The v1 framework renders `in-page-anchors` and `top-tabs` best; other allowed values validate but may render with degraded fidelity.
- **set_nav_entries** — replace `site.nav.entries` wholesale. Each entry is `{ label, target }` where target is `page` / `anchor` / `url`. Page and anchor targets must resolve to real page/module ids and labels must be unique.

**Page metadata:**
- **set_page_metadata** — identify a page by its current slug and patch its `title`, rename it via `new_slug`, and/or partial-merge its `seoMeta`. At least one of those three must be supplied. A `new_slug` rename keeps the page's stable `id` unchanged so nav entries that reference the page by id survive the rename.

**Module duplication:**
- **duplicate_module** — deep-clone a module instance on the same page: a fresh unique id with identical `type`, `version`, `variant`, `dials`, and `content`; asset references are duplicated by reference (no asset copying). The clone is inserted after the source by default, or after a named same-page `after_instance_id`.

Every change is run through the site-definition validator before it is accepted, so an invalid edit is rejected with a structured, self-correcting error rather than corrupting the draft. The site validator enforces nav target cross-references site-wide (not only via the nav tool): every `page` target's `pageId` must resolve, every `anchor` target's `pageId`+`moduleId` must resolve, and nav labels must be unique. This tool surface is what makes multi-page site reconstruction (the convert flow) possible.

**In scope:** the page-management tools (add/remove/reorder), nav editing tools (pattern + entries), page-metadata patching with id-stable rename, module duplication, the site-wide nav cross-reference validation, and exposure of these tools in the AI system prompt and the reproducing-a-website how-to.

**Out of scope:** UI affordances for these tools (chat-only in v1); bulk operations; cross-page module moves; asset copying on duplicate (refs duplicated by reference); and the orchestration that calls these tools during transcription.

## Technical Context
- Documented as existing behaviour reconciled from code. The page-CRUD tools landed under REQ-30; nav editing, page metadata, and module duplication landed under REQ-14, completing the AI editing tool surface that REQ-14/REQ-30 specified.
- All tools are registered as `state_edit` operator actions with `plan_tier: 'trial'` and `ui_route: null` (chat-only), dispatched through the shared apply-tool-call pipeline; each candidate next-state is checked by the shared site-definition validator before acceptance.
- Slugs are validated against `^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$`; the AI passes bare segments and a leading-slash input is rejected. Pages are stored canonically as `/{slug}`; `after_slug`, `set_page_metadata`'s `slug`, and `reorder_pages` accept the canonical or bare form.
- Code observation: `add_page` rejects a slug colliding with an existing page `id` (not only an existing slug) — a stricter uniqueness guard than the intent text spells out.
- Code observation: `duplicate_module` assigns a fresh unique id of the form `<type>-<random>` (uniqueness re-checked against all existing module ids across pages), not a literal UUID as the REQ-14 text phrased it; the observable contract is "new id, unique within the site".
- Code observation: the eager nav-entry strip in `remove_page` remains in place even though the site-wide validator would now also reject orphan nav targets; intent notes this redundancy is harmless and intentionally left.

## Dependencies
None.

## Story Points
2