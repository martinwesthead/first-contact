---
uid: request-19c39dce
id: REQ-14
type: request
title: 'AI tool surface completion: nav editing, page management, duplicate_module'
created_by: xgd
created_at: '2026-06-16T22:12:07.916638+00:00'
updated_at: '2026-06-16T22:12:07.916638+00:00'
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

Complete the v1 AI tool surface for site editing by adding the missing categories. Three groups of related tools:

1. **Nav editing** — `set_nav_pattern`, `set_nav_entries`. Promised in [[DOC-8]] §5.1 but never shipped.
2. **Page management** — `add_page`, `remove_page`, `reorder_pages`, `set_page_metadata`. Deferred in [[REQ-8]] as "v1.5" — now needed for multi-page sites to be AI-editable.
3. **Duplicate-module convenience** — `duplicate_module(instance_id, after_instance_id?)`. Not in §5.1; saves the AI from reconstructing identical module contents.

After this REQ: the AI can drive every operator-level edit available on a single-page or multi-page site without the operator falling back to UI affordances. Parity is restored between what DOC-8 promises and what the API actually exposes.

Design discussion: in-app feedback from Claude running in the builder identified nav editing, page management, and duplicate-module as the top three missing edit primitives. Per [[REQ-9]] parity invariant, AI tool exposure must match what the operator can do — these tools represent the matching API endpoints.

## Why free-coded

Tool surface gap-filling. Architecture is settled (each tool is a state edit applied through the existing dispatch from [[REQ-8]]). No new categories of behaviour — just adding tools to the registry, wiring them through the validator from [[REQ-3]], and updating module instance / page composition logic.

## Dependencies

- [[REQ-3]] — site-schema validator (each new tool's input is validated).
- [[REQ-8]] — tool dispatch path through `/api/chat`.
- [[REQ-9]] — OPERATOR_ACTIONS registry (each new tool is registered here per the parity principle).

## Deliverables

### Nav editing tools

**`set_nav_pattern(pattern: NavPattern)`**

- Sets `site.nav.pattern`. Allowed values per [[DOC-7]] §5: `'in-page-anchors' | 'top-tabs' | 'top-tabs-dropdown' | 'hamburger' | 'footer-only'`.
- v1 framework supports `in-page-anchors` and `top-tabs` only (per DOC-7 §5 phasing); other values pass validation but warn that rendering may degrade.

**`set_nav_entries(entries: NavEntry[])`**

- Replaces `site.nav.entries` wholesale.
- Each `NavEntry`: `{ label: string, target: PageRef | AnchorRef | UrlRef }` per [[REQ-3]] types.
- Validator enforces: every `PageRef` resolves to an existing page; every `AnchorRef` resolves to an existing module ID; non-circular; no duplicate labels at the same level.

### Page management tools

**`add_page(slug: string, title: string, after_slug?: string)`**

- Inserts a new page after the named page (or at the end if `after_slug` omitted).
- New page has empty `modules: []`. Default `seoMeta` synthesized from title.
- Validator: slug unique within the site; matches the slug format rules from REQ-10's `isValidSlug`.

**`remove_page(slug: string)`**

- Removes the page. Validator: page must exist; cannot remove the only page (a site must have at least one page); nav entries targeting the page are removed atomically (or the call fails if the operator's site has nav entries pointing at it — implementation choice, lean: remove atomically and report what was removed in the tool result).

**`reorder_pages(slugs: string[])`**

- New order specified as the full list of slugs. Validator: list must contain every existing page slug exactly once.

**`set_page_metadata(slug: string, updates: { title?: string, path?: string, seoMeta?: SeoMeta })`**

- Updates page-level metadata. `path` changes trigger validation that the new path doesn't collide with existing paths.

### Duplicate-module convenience tool

**`duplicate_module(instance_id: string, after_instance_id?: string)`**

- Deep-clones a module instance: new UUID, identical `type`, `version`, `variant`, `dials`, `content`. Asset references duplicated by reference (same `AssetRef`); no asset copying.
- Inserts after the named instance, or directly after the source instance if not specified.
- Validator: source instance must exist on some page; insertion target (if specified) must exist on the same page; new IDs unique.

### Registry entries (`OPERATOR_ACTIONS`)

Each tool registered per REQ-9's pattern with:

```
name:          (as above)
plan_tier:     'trial'   (these are state edits; available to all plans)
tool_spec:     Anthropic tool definition with typed args and finite enum descriptions
ui_route:      null      (chat-only in v1; future REQ may add UI affordances)
category:      'state-edit'  (per DOC-8 §5 — applied via state:diff event)
```

### UATs (`test_UAT_FC_<REQ-ID>_*`)

**Nav editing:**
- `set_nav_pattern_updates_site` — call sets `site.nav.pattern`; validator accepts allowed enum.
- `set_nav_pattern_rejects_unknown` — call with invalid pattern value rejected with structured error.
- `set_nav_entries_replaces_list` — call replaces nav entries; validator accepts; site reflects new list.
- `set_nav_entries_rejects_orphan_anchor` — entry targeting a non-existent module ID rejected.
- `set_nav_entries_rejects_orphan_page` — entry targeting a non-existent page slug rejected.

**Page management:**
- `add_page_inserts_with_empty_modules` — new page has `modules: []` and synthesized SEO.
- `add_page_rejects_duplicate_slug` — call with existing slug rejected.
- `add_page_rejects_invalid_slug` — call with invalid format (uppercase, special chars) rejected.
- `add_page_after_slug_inserts_in_position` — `after_slug` parameter places the new page in the right slot.
- `remove_page_removes_referenced_nav_entries` — removing a page also removes nav entries that pointed at it; the affected nav entries are reported in the tool result.
- `remove_page_rejects_last_page` — call to remove the only page is rejected (site must have at least one page).
- `reorder_pages_requires_full_list` — call with a slug list missing an existing page is rejected.
- `reorder_pages_applies_new_order` — call with a permuted list applies the new order to `site.pages`.
- `set_page_metadata_updates_title_and_seo` — title and SEO fields update; validator accepts.
- `set_page_metadata_rejects_path_collision` — changing path to one already in use rejected.

**Duplicate module:**
- `duplicate_module_clones_content_and_dials` — duplicated instance has identical type/version/variant/dials/content but new UUID.
- `duplicate_module_inserts_after_source_by_default` — without `after_instance_id`, new instance lands immediately after source.
- `duplicate_module_rejects_cross_page_target` — `after_instance_id` referring to an instance on a different page rejected.

## Out of scope

- UI affordances for any of these tools (chat-only in v1; future REQ may add per-page UI controls or sites-nav editor).
- Bulk operations (add multiple modules in one call, etc.) — single-instance only in v1.
- Move-module-across-pages — not in this REQ; AI can `duplicate_module` + `remove_module` if needed.
- Asset copying when duplicating a module — refs duplicated by reference; asset CRUD is a separate REQ.

## Risks / open items

- **Validator-coupling churn** — each tool needs validator support for its input shape. If [[REQ-3]] doesn't already cover nav-entry validation in detail, this REQ adds it.
- **Concurrency with revisions** — page reordering or removal during an active publish could create a snapshot inconsistency. Handled by REQ-11's snapshot-at-handler-entry semantic.
- **Tool list size** — adding 7 tools to OPERATOR_ACTIONS plus the existing set approaches double-digit count. Token cost in system prompt is acceptable; monitor.
