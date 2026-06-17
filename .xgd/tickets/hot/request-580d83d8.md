---
uid: request-580d83d8
id: REQ-12
type: request
title: 'Builder chrome + lifecycle UI: site header, draft/published pill, publish
  button, full-browser preview surface, revisions panel'
created_by: xgd
created_at: '2026-06-15T22:42:37.727136+00:00'
updated_at: '2026-06-15T22:42:37.727136+00:00'
completed_at: null
last_field_updated: created_at
status: draft
fields:
  priority: medium
  story_points: 5
  auto_merge_back: true
  needs_review: false
---

## Scope

Build the builder's **site chrome** and **lifecycle UI affordances** that consume [[REQ-11]]'s lifecycle API. Adds the top bar (logo, site name, draft/published status pill, publish button, view-live link, full-browser preview link, account menu), the full-browser preview surface served by the control-app, and the revisions panel. Wires the SSE channel's new event types into FE handlers.

After this REQ: the builder window has its full operator chrome. The operator can publish (paid plans), see draft/published divergence at a glance, open the production-build preview in a new tab, open the live site in a new tab, and view + roll back to prior revisions.

Design discussion: builder UX (header content, publish/draft pill placement, trial upsell affordance, single-site landing) and the three preview surfaces (in-builder iframe + control-app-served full-browser preview + view-live).

## Why free-coded

UI layer consuming a freshly-built API. Architecture is locked (DOC-8 + REQ-9 + REQ-11); deliverables are surfacing + wiring, not new design. Cohesive single intent: complete the builder's operator chrome.

## Dependencies

- [[REQ-9]] — Operator API foundation + SSE event registry.
- [[REQ-10]] — D1 schema (sites, revisions, accounts).
- [[REQ-11]] — Lifecycle API endpoints.
- [[REQ-8]] — Builder UI shell (panels, chat, iframe preview).
- [[REQ-6]] — `tools/generate` invocable for full-browser preview build.

## Deliverables

### Builder top bar (`packages/builder-ui`)

A `<BuilderHeader>` component, placed above `<BuilderLayout>` from REQ-8. Layout, left to right:

- **Hamburger / nav-drawer icon** — opens a drawer with "Sites" (placeholder list with one row in v1), "Settings" (placeholder), "Sign out". Hidden behind the icon to keep the bar compact.
- **Logo + product name** — "1st Contact" link to root.
- **Site display name** — large, non-interactive text in v1. Future REQ adds rename affordance.
- **Draft / published status pill** — single source of state:
  - "Up to date" (gray) — draft equals published.
  - "Unpublished changes" (amber) — draft differs from published.
  - "Never published" (blue) — `published_definition` is NULL.
- **Right-aligned action cluster:**
  - "View live" link — opens `<slug>.1stcontact.io` in a new tab. Disabled (with tooltip) when never published.
  - "Open preview build" link — opens `app.1stcontact.io/sites/<slug>/preview` in a new tab.
  - "Publish" button — primary style; disabled with upsell tooltip on trial plan. Click → POSTs to `/api/operator/publish_site`; pill updates on `action:notify`.
  - Account menu (avatar) — opens dropdown with "Sign out" only in v1.

The bar is fixed-height (e.g. 48px), full-width, sits above the chat / preview split.

### Full-browser preview surface

A new Astro route `/sites/<slug>/preview` on `apps/control-app`:

- Authenticated (control-app session required).
- Loads `sites.draft_definition` for the slug (verifies operator owns the site).
- Runs `tools/generate` against the draft definition.
- Returns the generated HTML directly (rendered output, not embedded in builder chrome — full document).
- Internal links in the rendered output are relative per the framework rule (CHAT-9 discussion; pending DOC-7 amendment) — clicking a link navigates within the preview, not to the live site.

This route is **not** indexed by search engines (sets `X-Robots-Tag: noindex`). It is hit only via the operator's authenticated session.

### Revisions panel

A `<RevisionsPanel>` component reachable from the nav drawer or via a chevron next to the status pill:

- Lists revisions for the current site (calls `list_revisions`).
- Each row: published_at (human-friendly), published_by, description, action button.
- Action button per row: "Restore" → confirmation dialog → POST `/api/operator/rollback_to_revision`.
- Live updates on `action:notify` events for `rollback_to_revision` / `publish_site`.

### SSE event handlers (`packages/builder-ui`)

Extend the SSE client from REQ-8 to handle the new event types from REQ-9:

- `action:notify` → toast + update local site / status pill / revisions panel as appropriate.
- `state:invalidate` → trigger a refetch of site definition (e.g. after rollback by another tab).
- `validation:error` → display in chat as an "AI tried X but the validator rejected it — retrying" line (REQ-8 already does this for state-edit errors; this extends to system-action errors).

### Status pill computation

A small Zustand selector derives the pill state from:

- `siteRecord.published_definition` (null → "Never published")
- `siteRecord.draft_definition` deep-equal `siteRecord.published_definition` → "Up to date"
- otherwise → "Unpublished changes"

Updates reactively as the draft store changes (per-tool-call) and on `action:notify` for publish events.

### Trial-plan upsell tooltip

When the session is `plan_tier: 'trial'`:

- Publish button is visually disabled with a tooltip: "Upgrade to publish your site." Tooltip includes a link to the (placeholder) pricing page.
- View-live link is hidden (no published URL exists for trial sites per CHAT-9 decision: trial users get no public URL).
- All other affordances behave normally.

The Publish button is still rendered (not hidden) per CHAT-9 lean: discoverability of the upgrade path matters in freemium.

## UATs (`test_UAT_FC_<REQ-ID>_*`)

- `header_renders_site_name_and_pill` — load builder for a site; header shows site name and pill state matches DB.
- `pill_up_to_date_when_draft_matches_published` — seed site with identical draft / published; pill shows "Up to date".
- `pill_unpublished_changes_after_edit` — issue a `set_module_dial` tool call; pill transitions to "Unpublished changes".
- `pill_never_published_when_published_null` — site with `published_definition = NULL`; pill shows "Never published".
- `publish_button_disabled_on_trial` — trial session shows disabled Publish + upsell tooltip; click does nothing.
- `publish_button_enabled_on_paid` — paid session shows enabled Publish; click POSTs to `/api/operator/publish_site` and surfaces toast on action:notify.
- `view_live_disabled_when_never_published` — link is disabled with explanatory tooltip when no published version exists.
- `view_live_opens_published_subdomain_in_new_tab` — paid + published site; click opens `<slug>.1stcontact.io` in `_blank`.
- `preview_build_route_runs_generator_against_draft` — `GET /sites/<slug>/preview` returns generated HTML rendered from `draft_definition`.
- `preview_build_route_authenticated` — same route without session returns 302 to login (or 401 placeholder in v1).
- `preview_build_route_noindex_header` — response includes `X-Robots-Tag: noindex`.
- `revisions_panel_lists_publish_history` — panel calls `list_revisions` and renders rows newest-first.
- `rollback_action_calls_api_and_updates_pill` — rollback button on a revision row POSTs to `/api/operator/rollback_to_revision`; on action:notify, pill recomputes to reflect new published state.
- `nav_drawer_lists_only_user_site_in_v1` — drawer's "Sites" section shows exactly the one site.

## Out of scope

- Site picker dropdown in the header (defer to multi-site UX REQ).
- Rename / settings UI for the site itself.
- Custom domain configuration UI.
- Account / plan / billing settings UI.
- Revision diff visualization.
- "Saving..." indicator for draft autosave to D1 (depends on autosave REQ).
- Notifications other than toasts (e.g. inbox, email).

## Risks / open items

- **Full-browser preview latency** — `tools/generate` inside the preview route blocks the response. Same 5–30s envelope as REQ-11's publish path. Acceptable as long as the operator understands "Open preview build" is a verification button, not an instant action. UI should show a loading state in the new tab.
- **Pill flicker on tool-call streams** — many `state:diff` events in a single AI turn could cause pill recompute thrash. Debounce pill state derivation to no more than 4Hz.
- **Authentication wall** — until the magic-link auth REQ lands, the v1 session stub assigns every operator to a fixed trial account; all paid-plan UATs run via header override. Production launch requires real auth before this surface is meaningful for paying customers.
