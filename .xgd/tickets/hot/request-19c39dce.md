---
uid: request-19c39dce
id: REQ-14
type: request
title: 'AI tool surface completion: nav editing, page management, duplicate_module'
created_by: xgd
created_at: '2026-06-16T22:12:07.916638+00:00'
updated_at: '2026-06-20T19:32:22.111347+00:00'
completed_at: null
last_field_updated: status
status: free_coded
fields:
  priority: medium
  story_points: 3
  auto_merge_back: true
  needs_review: false
  commits:
  - be61b26c107e2da068f0b5b8afaafb1516a5e5cd
  version: 0.14.1241
---

## Scope

Complete the v1 AI tool surface for site editing by adding the missing categories. Originally three groups; the page-CRUD group landed under [[REQ-30]] (multi-page convert demo needed it sooner). Remaining work:

1. **Nav editing** — `set_nav_pattern`, `set_nav_entries`. Promised in [[DOC-8]] §5.1 but never shipped.
2. **Page metadata** — `set_page_metadata` (page-level title / seoMeta updates, optional slug rename). Sibling to REQ-30's add/remove/reorder.
3. **Duplicate-module convenience** — `duplicate_module(instance_id, after_instance_id?)`. Not in §5.1; saves the AI from reconstructing identical module contents.

After this REQ: the AI can drive every operator-level edit available on a single-page or multi-page site without the operator falling back to UI affordances. Parity is restored between what DOC-8 promises and what the API actually exposes.

Design discussion: in-app feedback from Claude running in the builder identified nav editing, page management, and duplicate-module as the top three missing edit primitives. Per [[REQ-9]] parity invariant, AI tool exposure must match what the operator can do — these tools represent the matching API endpoints.

## Why free-coded

Tool surface gap-filling. Architecture is settled (each tool is a state edit applied through the existing dispatch from [[REQ-8]]). No new categories of behaviour — just adding tools to the registry, wiring them through the validator from [[REQ-3]], and updating module instance / page composition logic.

## Dependencies

- [[REQ-3]] — site-schema validator (each new tool's input is validated).
- [[REQ-8]] — tool dispatch path through `/api/chat`.
- [[REQ-9]] — OPERATOR_ACTIONS registry (each new tool is registered here per the parity principle).
- [[REQ-30]] — closed the page-CRUD section (add/remove/reorder_pages); this REQ no longer ships those.

## Page-CRUD scope clarification (post-REQ-30)

`add_page`, `remove_page`, `reorder_pages` are **complete** as of REQ-30 commits `44c637a259abe504282c8bcb50b3994800f5b127` and `1d249b0884d37f0cc8eca955ae9ee98f789c7c50`. REQ-14 inherits only:
- `set_page_metadata` (title / seoMeta / optional slug rename) — REQ-30 did not cover this.

## Deliverables

### Nav editing tools

**`set_nav_pattern(pattern: NavPattern)`**

- Sets `site.nav.pattern`. Allowed values per [[DOC-7]] §5: `'in-page-anchors' | 'top-tabs' | 'top-tabs-dropdown' | 'hamburger' | 'footer-only'`.
- v1 framework supports `in-page-anchors` and `top-tabs` only (per DOC-7 §5 phasing); other values pass validation but warn that rendering may degrade.

**`set_nav_entries(entries: NavEntry[])`**

- Replaces `site.nav.entries` wholesale.
- Each `NavEntry`: `{ label: string, target: NavTarget }` per the existing site-schema discriminated union.
- Validator enforces (NEW in this REQ): every `kind=page` target's `pageId` resolves to an existing page id; every `kind=anchor` target's `pageId`+`moduleId` resolves to an existing module on that page. No duplicate labels at the same level.
- This validation is added to `Site.superRefine` in `packages/site-schema/src/schema.ts` (catches the bad shape wherever it appears, not only via this tool).

### Page metadata tool

**`set_page_metadata(slug: string, updates: { title?: string, new_slug?: string, seoMeta?: SeoMeta })`**

- Identifies the page by its current canonical slug (e.g. `'/'` or `'/menu'`, or bare segment `menu` — same normalization as REQ-30's `after_slug`).
- `title` updates `page.title`.
- `new_slug` renames the page (bare segment, validated against the slug RE). Uniqueness checked against existing pages. `page.id` is left unchanged so nav entries' `pageId` references survive the rename.
- `seoMeta` patches the page's SEO meta object (partial — any field provided overwrites; omitted fields preserved).
- Validator: at least one of `title|new_slug|seoMeta` must be supplied.

### Duplicate-module convenience tool

**`duplicate_module(instance_id: string, after_instance_id?: string)`**

- Deep-clones a module instance: new UUID, identical `type`, `version`, `variant`, `dials`, `content`. Asset references duplicated by reference (same `AssetRef`); no asset copying.
- Inserts after the named instance, or directly after the source instance if not specified.
- Validator: source instance must exist on some page; insertion target (if specified) must exist on the *same* page; new IDs unique.

### Registry entries (`OPERATOR_ACTIONS`)

Each tool registered per REQ-9's pattern with:

```
plan_tier:     'trial'   (state edits; available to all plans)
ui_route:      null      (chat-only in v1)
category:      'state_edit'
```

### UATs (`test_UAT_FC_REQ-14_*`)

**Nav editing:**
- `set_nav_pattern_updates_site` — call sets `site.nav.pattern`; validator accepts allowed enum.
- `set_nav_pattern_rejects_unknown` — call with invalid pattern value rejected with structured error.
- `set_nav_entries_replaces_list` — call replaces nav entries; validator accepts; site reflects new list.
- `set_nav_entries_rejects_orphan_anchor` — entry targeting a non-existent module ID rejected.
- `set_nav_entries_rejects_orphan_page` — entry targeting a non-existent page id rejected.
- `validate_site_rejects_orphan_nav_page` — Site.superRefine itself rejects, not just the tool.

**Page metadata:**
- `set_page_metadata_updates_title_and_seo` — title and SEO fields update; validator accepts.
- `set_page_metadata_renames_slug` — `new_slug` renames; nav entries pointing at the page (by id) still resolve.
- `set_page_metadata_rejects_slug_collision` — renaming to an existing slug rejected.
- `set_page_metadata_rejects_invalid_slug` — bad slug format rejected.

**Duplicate module:**
- `duplicate_module_clones_content_and_dials` — duplicated instance has identical type/version/variant/dials/content but new UUID.
- `duplicate_module_inserts_after_source_by_default` — without `after_instance_id`, new instance lands immediately after source.
- `duplicate_module_rejects_cross_page_target` — `after_instance_id` referring to an instance on a different page rejected.

## Out of scope

- UI affordances for any of these tools (chat-only in v1; future REQ may add per-page UI controls or sites-nav editor).
- Bulk operations (add multiple modules in one call, etc.) — single-instance only in v1.
- Move-module-across-pages — not in this REQ; AI can `duplicate_module` + `remove_module` if needed.
- Asset copying when duplicating a module — refs duplicated by reference; asset CRUD is a separate REQ.
- Path changes (REQ-14 original spec mentioned `path` updates in `set_page_metadata`; `slug` IS the path in this schema, so renaming `slug` is the path-change mechanism — no separate `path` field).

## Risks / open items

- **Validator-coupling churn** — each tool needs validator support for its input shape. The nav cross-ref check is added to `Site.superRefine` (one place, broad coverage). Existing `remove_page` (from REQ-30) currently strips orphan nav entries eagerly; with the new validator that eager strip becomes redundant but harmless — leave it.
- **Concurrency with revisions** — page renaming during an active publish could create a snapshot inconsistency. Handled by REQ-11's snapshot-at-handler-entry semantic.
- **Tool list size** — adding 4 tools to OPERATOR_ACTIONS plus the existing set approaches double-digit count. Token cost in system prompt is acceptable; monitor.