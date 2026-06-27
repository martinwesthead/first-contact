---
uid: report-2e32d7c5
id: REPORT-594
type: report
title: 'Overlap resolution: cluster 5'
created_by: xgd
created_at: '2026-06-27T00:40:29.752049+00:00'
updated_at: '2026-06-27T00:40:29.752049+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: overlap_resolution
  subject_uid: report-cda4212b
  cluster_id: '5'
---

## Cluster 5 Resolution

**Boundary**: Module rendering: renderers shipped with the catalog vs renderers owned by the generator
**Stories resolved**: 3

### Boundary rationale

The catalog (capability-3630a42c, "Framework Module Catalog") owns the module
contract, the typed registry, the renderers themselves (chrome and content),
the scoped theme-token CSS each renderer ships, and the content-validator that
enforces the contract.

The generator (capability-820fbc22, "Static Site Generator") owns the build
pipeline that consumes a validated site definition and the catalog:
programmatic API + CLI, page-file emission, slug routing, module-instance
anchor wrapping, theme.css concatenation (pulling module styles out of the
registry but owned by the build step), asset copying, head metadata, Google
Fonts link emission, and CLI/error reporting.

A renderer's own output and scoped CSS belong to the catalog; how that output
is wrapped, where it is written, and what surrounds it on the page belong to
the generator. Registry membership/lookup is catalog; registry consumption to
materialize a file tree is generator.

### Actions

| Story | Action | From | To | Rationale |
|-------|--------|------|-----|-----------|
| story-1d5b450f | confirm | capability-3630a42c | (no change) | Defines the module contract, the typed registry, and three catalog-shipped chrome renderers (header, hero, footer) with their scoped theme-token CSS plus a browser-safe meta subpath. Every AC concerns what the catalog ships and exposes (contract conformance, registry lookup, catalog-miss errors, renderer output, scoped CSS policy). No AC concerns generator pipeline behavior, file emission, or build dispatch. Sits cleanly on the catalog side. |
| story-f1e061ba | confirm | capability-3630a42c | (no change) | Adds the remaining three catalog-shipped renderers (text-block, services-grid, contact-form), extends the module-contract content validator with list-of/nested-object/enum shapes, and asserts the registry resolves all six Phase 0 modules. The contact-form progressive-enhancement ACs describe the catalog renderer's own no-JS/JS behavior, not generator dispatch. The "registry resolves all six" AC is a catalog completeness check. All scope is catalog-side. |
| story-d111f966 | confirm | capability-820fbc22 | (no change) | Defines the runGenerate API, fc-generate CLI, and the build pipeline that consumes a validated site definition: HTML5 page emission to slug-derived paths, instance-id anchor wrapping, theme.css concatenation (pulling from the catalog but owned by the generator), asset copying, head metadata, Google Fonts link emission, --clean handling, SiteLoadError reporting, CLI exit-code contract. The generator dispatches to catalog renderers via the registry but does not define any renderers itself. Sits cleanly on the generator side. |

### Result

All three stories remain in their currently-assigned capabilities. The
apparent overlap is a clean boundary, not a duplication: stories 1d5b450f and
f1e061ba define renderers that the catalog ships, story d111f966 defines the
generator that dispatches to those renderers. No story changes, AC changes,
or merges were required.
