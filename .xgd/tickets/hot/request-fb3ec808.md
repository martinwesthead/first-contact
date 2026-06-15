---
uid: request-fb3ec808
id: REQ-5
type: request
title: 'Framework: content modules (text-block, services-grid, contact-form)'
created_by: xgd
created_at: '2026-06-12T23:06:39.897690+00:00'
updated_at: '2026-06-15T17:42:03.698661+00:00'
completed_at: null
last_field_updated: status
status: ready_to_reconcile
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
  story_points: 4
  commits:
  - 1befb476d98636a3b74ed88d216de7a0bd100bff
---

## Scope

Add the three content modules — `text-block`, `services-grid`, `contact-form` — to `packages/framework`, completing the 6-module Phase 0 catalog. Each module follows the same `moduleMeta` contract established in REQ-4; this REQ exercises markdown rendering, list-of-content fields, and a form module with progressive-enhancement client JS.

The `contact-form` module submits to a configurable `action` URL but produces no backend behavior in this REQ — the real handler (D1 INSERT + email notification) ships in REQ-7. For Phase 0 the form can be deployed and exercised against a stub endpoint added in REQ-6.

Design discussion: see [[DOC-7]] (Website Framework Architecture Principles), particularly §3 (Module Contract) and §7.4 (Graceful degradation through `text-block`).

## Why free-coded

Catalog construction — same contract as REQ-4, applied to three more modules. One cohesive unit because the three modules together cover the content half of Phase 0's marketing-site needs (manifesto, services, lead capture).

## Deliverables

### `text-block` (2 variants)

- File: `packages/framework/src/modules/text-block/index.astro`
- Variants:
  - `prose` — `container.narrow` width, intended for articles, about-as-blog, terms, founder notes (per DOC-7 §7.4)
  - `landing` — `container.default` width, intended for marketing manifestos with more breathing room
- Dials: `size` (sm/md/lg — affects body type scale), `align` (left/center), `spacingTop`, `spacingBottom`, `surface`, `textAlign` (left/center)
- Content:
  - `heading` (optional string)
  - `body` (markdown, required)
- Markdown rendering via `@astrojs/markdown-remark` or `unified`/`remark`. Supports headings, lists, links, images, blockquotes, code blocks. Images use the framework's responsive image rendering (lazy, srcset).
- Container width is dictated by the variant, not by a dial — keeps variants meaningful.

### `services-grid` (2 variants)

- File: `packages/framework/src/modules/services-grid/index.astro`
- Variants: `three-col`, `two-col`. Below `breakpoint.md` both collapse to single column.
- Dials: `spacingTop`, `spacingBottom`, `surface`, `gap` (tight/normal/loose)
- Content:
  - `heading` (optional string)
  - `subhead` (optional markdown)
  - `items` (list of `{ icon?: AssetRef | string, title: string, body: markdown, cta?: { label, href } }`, length validated 2..6)
- Cards render with `radius.lg`, optional icon at top, title, body, optional CTA at bottom.

### `contact-form` (1 variant)

- File: `packages/framework/src/modules/contact-form/index.astro`
- Variant: `inline`
- Dials: `spacingTop`, `spacingBottom`, `surface`, `align` (left/center)
- Content:
  - `heading` (optional string)
  - `subhead` (optional markdown)
  - `action` (URL string, required — e.g., `/api/forms/contact`)
  - `fields` (list of `{ name, label, type: 'text'|'email'|'tel'|'textarea', required: boolean }`, length 1..8)
  - `submitLabel` (optional string, default `"Send"`)
  - `successMessage` (optional markdown)
- Server-rendered HTML form — works fully without JS (submits, page reloads with response).
- Progressive enhancement via small island JS:
  - Intercepts submit
  - `fetch` POSTs JSON to `action`
  - On 200, replaces form with `successMessage` (rendered markdown)
  - On non-200, surfaces the response error inline; does not navigate
- Honeypot field (`hp_<random>` style, hidden via CSS, server should reject when filled).
- A `data-turnstile-target` element renders where the Turnstile widget will mount; the actual widget is wired in REQ-7. Module degrades cleanly without it.

### Updates to the registry

- `packages/framework/src/modules/registry.ts` extended to include all six modules.
- `test_UAT_FC_REQ-4_every_module_exports_module_meta` is amended (or re-exercised) against the new modules — they all conform.

## Explicitly NOT in this ticket

- The form endpoint (`/api/forms/contact`) — added in REQ-6 as a stub returning `{success:true}`, and made real in REQ-7.
- D1 leads schema, INSERT, or any persistence — REQ-7.
- Resend / email-provider integration — REQ-7.
- Cloudflare Turnstile widget script loading and verification — REQ-7. (The module renders a mount point; the script + token submission are wired then.)
- Any actual marketing-site content for these modules — REQ-6.
- Additional variants beyond those listed (e.g., `text-block` with side image, `services-grid` with image cards). Captured in the catalog evolution log if requested later (DOC-7 §7).

## Test approach (UATs)

Runner: vitest, Astro container API for component tests, JSDOM for client-side form behavior.

### `text-block`

- `test_UAT_FC_REQ-5_text_block_prose_variant_uses_narrow_container`
- `test_UAT_FC_REQ-5_text_block_landing_variant_uses_default_container`
- `test_UAT_FC_REQ-5_text_block_renders_markdown_with_image_and_list`
- `test_UAT_FC_REQ-5_text_block_omits_heading_when_not_provided`

### `services-grid`

- `test_UAT_FC_REQ-5_services_grid_three_col_renders_three_cards`
- `test_UAT_FC_REQ-5_services_grid_two_col_renders_two_cards`
- `test_UAT_FC_REQ-5_services_grid_collapses_to_single_column_below_md` — assert the responsive class / media-query rule exists.
- `test_UAT_FC_REQ-5_services_grid_rejects_item_count_outside_2_to_6` — validation at content-schema level.

### `contact-form`

- `test_UAT_FC_REQ-5_contact_form_renders_configured_fields` — feed 3 fields, assert 3 `<input>`/`<textarea>` with right labels.
- `test_UAT_FC_REQ-5_contact_form_action_attribute_uses_configured_url`
- `test_UAT_FC_REQ-5_contact_form_includes_honeypot_hidden_field`
- `test_UAT_FC_REQ-5_contact_form_renders_turnstile_mount_point`
- `test_UAT_FC_REQ-5_contact_form_submits_without_js_via_html_post` — JSDOM, no client script, assert form action behaviour.
- `test_UAT_FC_REQ-5_contact_form_client_enhancement_intercepts_submit_and_posts_json` — JSDOM + island script, mock `fetch`, assert JSON payload.
- `test_UAT_FC_REQ-5_contact_form_client_renders_success_message_on_200`
- `test_UAT_FC_REQ-5_contact_form_client_renders_error_on_non_200`

### Registry

- `test_UAT_FC_REQ-5_registry_includes_all_six_phase0_modules` — `getModule` returns each of the 6.

## Dependencies / follow-up tickets

- **Depends on**: REQ-3 (site-schema), REQ-4 (framework chrome + registry + tokens).
- **Unblocks**:
  - REQ-6 (`tools/generate` + site definition + wire `public-site`) — uses all 6 modules.
  - REQ-7 (lead-capture pipeline) — replaces the form's stub endpoint with a real handler; activates Turnstile.