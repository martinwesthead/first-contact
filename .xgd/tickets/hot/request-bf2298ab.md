---
uid: request-bf2298ab
id: REQ-3
type: request
title: 'site-schema package: types + runtime validation for site definitions'
created_by: xgd
created_at: '2026-06-12T23:06:27.302957+00:00'
updated_at: '2026-06-12T23:06:27.302957+00:00'
completed_at: null
last_field_updated: created_at
status: draft
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
  story_points: 2
---

## Scope

Build the `@1stcontact/site-schema` package: TypeScript types and runtime validation for site definitions. This is the foundational data contract that every other framework package and consumer (`packages/framework`, `tools/generate`, `apps/control-app`, eventually the D1 site_definitions table) imports.

Design discussion: see [[DOC-7]] (Website Framework Architecture Principles), particularly §2 (Composition Model), §3 (Module Contract), §4 (Theme Token System), and §5 (Navigation Patterns).

## Why free-coded

Foundational data shape — narrow, well-specified, one cohesive unit. No algorithmic design, just translating DOC-7's hierarchy into TypeScript + a runtime validator. Future schema evolution will go through normal versioning, not free-coding.

## Deliverables

### Types (`packages/site-schema/src/types.ts`)

TypeScript types mirroring DOC-7 §2.1:

```typescript
Site                  // top-level
SiteConfig            // business profile, contact, integrations
ThemeTokens           // palette, typography, spacing, radius, shadow, containers, breakpoints
NavConfig             // pattern + entries
NavPattern            // 'in-page-anchors' | 'top-tabs' | 'top-tabs-dropdown' | 'hamburger' | 'footer-only'
NavEntry              // label + target (PageRef | AnchorRef | UrlRef)
Page                  // id, path, title, seoMeta, modules[]
ModuleInstance        // type, version, variant, dials, content
Dials                 // Record<string, string>
ModuleContent         // Record<string, ContentValue>
ContentValue          // string | MarkdownString | AssetRef | UrlString | ContentValue[] | EnumValue
AssetRef              // id, src, alt, focalPoint
SeoMeta               // title, description, ogImage
```

Types are derived from the Zod schemas (single source of truth via `z.infer`).

### Schema (`packages/site-schema/src/schema.ts`)

Zod schemas matching every type above. Validation enforces:

- Required shape of Site, Page, ModuleInstance
- Field types (`string`, `number`, hex color, URL, etc.)
- Universal enums: `NavPattern`, content-value primitive types
- Theme token slot completeness — every token slot defined in DOC-7 §4 is present with a value of the correct primitive type

The schema does **not** validate catalog membership — whether `type: 'hero'` is a real module, or whether `'image-left'` is a valid variant for `photo-text`, is the framework's responsibility at render time using `moduleMeta`. The schema validates structure; the framework validates catalog-correctness.

### Validator (`packages/site-schema/src/validate.ts`)

```typescript
export function validateSite(input: unknown): Result<Site, ValidationError[]>
```

Returns a discriminated union: `{ok: true, value: Site}` or `{ok: false, errors: ValidationError[]}`. Each error includes a JSON-pointer-style path and human-readable message.

### Package wiring

- `packages/site-schema/package.json` — `"main"`, `"types"`, `"exports"`, dependency on `zod`
- `packages/site-schema/tsconfig.json` — extends `tsconfig.base.json`, emits `dist/`
- Built artifacts under `dist/`; sources under `src/`
- Pure ESM

## Explicitly NOT in this ticket

- Catalog validation (module type / variant / dial / content-field correctness against a module's `moduleMeta`) — that belongs in `packages/framework`.
- Theme token *values* or *defaults* — only the slot contract here; defaults live in `packages/framework`.
- JSON Schema export (for use by external tools or Astro content collections) — can be added later via `zod-to-json-schema` if needed.
- The site-definition file format itself (JSON vs YAML vs TOML) — the schema validates parsed objects; format choice belongs to `tools/generate`.
- Any module-specific schemas — each module declares its own `contentSchema` in `moduleMeta`.

## Test approach (UATs)

Runner: vitest. Files under `tests/` matching the existing convention.

- `test_UAT_FC_REQ-3_valid_minimal_site_validates` — smallest possible Site (one page, one module) passes.
- `test_UAT_FC_REQ-3_valid_full_site_validates` — Site exercising every slot (theme tokens, nav, multiple modules, assets) passes.
- `test_UAT_FC_REQ-3_invalid_module_instance_shape_rejected` — ModuleInstance missing `type` or `version` produces a `ValidationError` with the expected path.
- `test_UAT_FC_REQ-3_invalid_nav_pattern_rejected` — Nav pattern not in the enum rejected.
- `test_UAT_FC_REQ-3_theme_tokens_missing_slot_rejected` — A required token slot omitted rejected with the slot path.
- `test_UAT_FC_REQ-3_invalid_color_format_rejected` — Non-hex color in a color token slot rejected.
- `test_UAT_FC_REQ-3_validator_returns_typed_site` — On success, TS narrows to `Site` (compile-time test via `expectTypeOf`).
- `test_UAT_FC_REQ-3_catalog_membership_not_validated` — Site with unknown module `type` value still passes schema validation (catalog check is the framework's job). Documents the boundary.

## Dependencies / follow-up tickets

- **Depends on**: REQ-1 (monorepo scaffold), REQ-2 (1stcontact rename).
- **Unblocks**:
  - REQ-4 (framework chrome modules + tokens + CSS generator) — imports types from this package.
  - REQ-5 (framework content modules) — imports types from this package.
  - REQ-6 (`tools/generate` + site definition + wire `public-site`) — imports validator.
