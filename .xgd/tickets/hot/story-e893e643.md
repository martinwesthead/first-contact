---
uid: story-e893e643
id: STORY-60
type: story
title: 'AI page-management tools: add, remove, and reorder pages in a site draft'
created_by: xgd
created_at: '2026-06-28T20:47:07.071919+00:00'
updated_at: '2026-06-28T20:47:07.071919+00:00'
completed_at: null
last_field_updated: created_at
status: unplanned
fields:
  intent_uid: bundle-24c4d23c
  capability_uid: capability-6694c60f
  story_kind: feature
  story_points: 2
---

## Story
**As an** operator reconstructing or editing a multi-page site through the builder chat, **I want** the AI assistant to add new pages, remove pages, and reorder the page sequence, **so that** I can build and maintain sites that have more than one page.

## Description
This story adds page-level management to the AI's site-editing tool surface, alongside the existing module, theme-token, and site-config editing tools. The assistant gains three new state-editing tools:

- **add_page** — insert a new, empty page given a bare `slug` (e.g. `menu`, `about-us`, stored canonically as `/menu`) and a `title`. An optional `after_slug` controls where in the page order the new page lands; without it, the page is appended last. New pages start with no modules.
- **remove_page** — delete a page by its slug. The site must always retain at least one page. Navigation entries that point at the removed page are stripped at the same time so the site never references a missing page.
- **reorder_pages** — set the full page order by supplying every existing page slug exactly once in the desired sequence.

Every change is run through the site-definition validator before it is accepted, so an invalid edit is rejected with a structured, self-correcting error rather than corrupting the draft. This capability is what makes multi-page site reconstruction (the convert flow) possible; before it, the assistant could only operate on a single page.

**In scope:** the three page-management tools, their input contracts, slug validation/uniqueness, ordering control, the single-page-floor guard, atomic nav cleanup on removal, and exact-set validation on reorder.

**Out of scope:** nav-entry editing tools and module duplication (the remaining parts of the AI tool-surface-completion intent), and the orchestration that calls these tools during transcription.

## Technical Context
- Implements the page-management section of the AI tool surface (REQ-14), which REQ-30 reports was specified but never implemented prior to this bundle. Documented here as existing behaviour reconciled from code.
- The three tools are registered as `state_edit` operator actions and dispatched through the same apply-tool-call pipeline as the existing module/theme tools; each candidate next-state is checked by the shared site-definition validator (REQ-3) before acceptance.
- Slugs are validated against `^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$`; the AI passes bare segments and a leading-slash input is rejected. Pages are stored with a canonical `/{slug}` form; `after_slug` and `reorder_pages` accept the canonical form.
- Code observation: `add_page` also rejects an input whose slug collides with an existing page `id` (not only an existing slug) — a stricter uniqueness guard than the intent text spells out.

## Dependencies
None.

## Story Points
2
