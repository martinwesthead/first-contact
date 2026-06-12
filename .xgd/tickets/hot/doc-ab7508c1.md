---
uid: doc-ab7508c1
id: DOC-7
type: doc
title: Website Framework Architecture Principles
created_by: xgd
created_at: '2026-06-12T22:12:47.112839+00:00'
updated_at: '2026-06-12T22:12:47.112839+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  doc_kind: architecture
---

# First-Contact Website Framework — Architecture Principles

## 1. Purpose & Scope

This document captures the durable architectural principles for the first-contact website framework: the shared engine that renders both the first-contact marketing site and all customer sites built on the platform.

It is paired with [[DOC-4]] (product vision) and [[DOC-5]] (platform architecture). DOC-5 covers the platform-wide Cloudflare/D1/R2/Workers shape; this doc covers the framework specifically — how a site is modeled, rendered, and evolved.

**This document commits to:**

- A module-based composition model.
- A strictly structured-change discipline: AI edits site definitions as data, never as code or CSS.
- A finite, evolving catalog of modules with bounded per-instance flexibility.
- One framework, two consumption paths: file-backed (first-contact's own marketing site) and D1-backed (customer sites).
- Astro as the rendering technology; Astro + React for the control app.

**This document deliberately does not commit to:**

- Specific module catalog contents (handled in REQ tickets per iteration).
- Specific theme token values (defined per site, evolved over time).
- Specific schemas for D1 storage of site definitions (handled in DOC-5 and dedicated schema tickets).
- Pixel-precise positioning, art-directed layouts, or per-site custom CSS — these are out of scope by design.

---

## 2. Composition Model

### 2.1 Hierarchy

```
Site
├── config          (business profile, contact, hours, integrations)
├── theme           (site-wide token values)
├── nav             (pattern + entries)
├── pages[]
│   └── modules[]   (ordered list of module instances)
│       └── { type, version, variant, dials, content }
└── assets          (image / file references)
```

A **single-page site** is one page with N module instances. A **multi-page site** is N pages, each with its own module list. Both are the same primitive — there is no separate "single-page mode."

### 2.2 Two consumption paths, one framework

| Path | Site definition source | Use |
|---|---|---|
| **File-backed** | JSON files under `sites/<name>/` in the repo | first-contact's own marketing site; showcase sites; offline development |
| **D1-backed** | Records in the Cloudflare D1 product database | All customer sites created via the platform |

The renderer accepts either source via a common interface. Module rendering is identical in both cases — there are no divergent code paths.

### 2.3 The module is the unit of reuse

Modules are the atomic unit of visual composition. A module is not a snippet of HTML or a CSS class — it is a versioned, contract-bound Astro component. The catalog of available module types is closed at any given framework version; it grows only through deliberate framework iteration (see §7).

---

## 3. Module Contract

### 3.1 Required exports

Every module exports a `moduleMeta` object declaring its full contract:

```typescript
export const moduleMeta = {
  id: 'photo-text',                       // stable identifier, never renamed
  version: 1,                             // monotonically incremented on breaking change
  variants: ['image-left', 'image-right', 'stacked'] as const,
  dials: {
    size:          ['sm', 'md', 'lg'],
    shape:         ['square', 'rounded', 'circle'],
    align:         ['left', 'center', 'right'],
    spacingTop:    ['none', 'sm', 'md', 'lg', 'xl'],
    spacingBottom: ['none', 'sm', 'md', 'lg', 'xl'],
    surface:       ['default', 'subtle', 'inverse', 'accent'],
  },
  contentSchema: {
    heading: { type: 'string',     required: false },
    body:    { type: 'markdown',   required: true },
    image:   { type: 'asset-ref',  required: true },
  },
} as const;
```

### 3.2 Contract rules

1. **All variants and dials are finite enumerations.** Free-form strings, numbers, or objects are forbidden for visual properties.
2. **Content is structured.** Every content field has a typed schema entry (`string`, `markdown`, `asset-ref`, `url`, `enum`, `list-of<T>`).
3. **Modules are pure functions of their props.** Modules never read site-wide state outside what is passed in.
4. **CSS is scoped, class-based, no inline styles.** Visual tunables flow through CSS custom properties set by the theme + class names derived from variant and dial values.
5. **No per-instance style overrides.** A module instance cannot carry custom CSS or arbitrary style props.
6. **Same render in both consumption paths.** A module produces identical output regardless of whether its props came from a file or D1.

### 3.3 Module identity and stability

- `id` is permanent. Renaming a module is forbidden; deprecate and supersede instead.
- `version` increments on any breaking change to `variants`, `dials`, or `contentSchema`.
- Backward-compatible additions (new variant, new dial value, new optional content field) do not require a version bump.

---

## 4. Theme Token System

### 4.1 Two layers of tokens

| Layer | Scope | Owner | Examples |
|---|---|---|---|
| **Site-wide theme tokens** | Site | AI / operator | Palette, type family, type scale, spacing scale, radius, shadow, container width, breakpoints |
| **Per-instance dials** | Single module instance | AI / operator | Size, shape, alignment, spacing top/bottom, surface, text-align, emphasis |

Site-wide tokens set the visual language. Per-instance dials let individual module instances vary within that language. Together they absorb the great majority of "nudge it slightly" requests as structured choices.

### 4.2 Implementation

- Tokens are realized as **CSS custom properties** (`--color-primary`, `--space-md`, etc.).
- Each site has a **generated CSS file** produced at build time from its token values. This file is cacheable, inspectable, and immutable per build.
- Per-instance dials apply as class names on the module's root element. Module CSS resolves dial classes to token references.
- Mobile-first responsive system: all spacing, type, and container tokens have responsive scales; modules use these directly rather than declaring media queries.

### 4.3 What tokens cannot do

- Tokens cannot introduce new visual properties beyond the framework's token contract.
- Tokens cannot inject arbitrary CSS rules.
- Tokens cannot target individual elements outside the module system.

---

## 5. Navigation Patterns

Navigation pattern is a top-level site setting. The framework provides a finite, enumerated set:

| Pattern | Use |
|---|---|
| `in-page-anchors` | Single-page sites; module IDs become anchor targets; smooth-scroll |
| `top-tabs` | Multi-page sites, ≤ 6 top-level entries |
| `top-tabs-dropdown` | Multi-page with sub-pages (e.g., Services → Catering / Corporate / Weddings) |
| `hamburger` | Mobile-style menu used on desktop; minimal-aesthetic sites |
| `footer-only` | No top nav; in-page CTAs only |

The phased delivery order is `in-page-anchors` and `top-tabs` first (sufficient for first-contact's own site and most service businesses), with the remainder added as customer demand justifies. All patterns are implemented in the shared library; per-site customization is limited to choice of pattern, entry labels, and entry order.

---

## 6. Structured Changes Only

### 6.1 The discipline

AI modifies site definitions as **structured data** — JSON edits to the site config, page composition, module instances, and theme tokens. AI does not write code, CSS, HTML, or unstructured strings outside content fields.

### 6.2 What AI is allowed to edit

- Site config values (e.g., business name, contact email).
- Page composition (add, remove, reorder pages and module instances).
- Module variant selection (within the module's declared variants).
- Module dial values (within the module's declared dial enumerations).
- Module content (within the module's declared content schema).
- Site-wide theme token values (within the token contract).
- Navigation pattern, entries, and labels.
- Asset references (uploading new assets, attaching to module instances).

### 6.3 What AI is forbidden to do

- Write or edit any framework code, including module source files.
- Write or edit CSS — neither global, per-site, nor per-instance.
- Add free-form visual properties outside the dial and token contracts.
- Bypass content schemas with raw HTML in content fields.
- Introduce new module types or variants without going through framework iteration.

### 6.4 Escape hatch policy

A per-instance custom CSS escape hatch is **not implemented in v1**. If introduced later it MUST be:

- **Operator-only** — accessible only to the platform operator, never to AI or end users.
- **Per-instance scoped** — never global, never inheritable across instances.
- **Logged as drift** — tracked centrally; repeated overrides of the same kind signal a missing variant in the catalog and trigger a framework iteration.

The intent is to keep the door closed by default and visible when opened.

---

## 7. Catalog Evolution

### 7.1 Customer-driven, framework-bound

When a customer's need cannot be expressed via existing modules, variants, dials, or tokens, the response is to **iterate the framework**, not to fork the site:

```
customer asks for X
  → request becomes a ticket on the platform
  → framework iteration adds module / variant / dial / token
  → all sites gain the capability
  → request now in-catalog for the next customer
```

This turns the catalog gap from a customer-facing limitation into a system-strengthening signal, and aligns with the broader XGD demonstration: customer demand drives autonomous framework development.

### 7.2 Variant-first discipline

When evaluating a new capability, the question order is:

1. Is this a new **dial value** on an existing module? (Cheapest.)
2. Is this a new **variant** of an existing module? (Cheap.)
3. Is this a new **module**? (Expensive; only when no existing module fits.)

The catalog should grow primarily through new variants. Module proliferation is a smell.

### 7.3 Vertical-specific tagging

Modules and variants may be tagged as vertical-specific (e.g., `vertical: catering` for an allergen-tagged menu variant). The general module set should remain lean; vertical-specific capabilities are surfaced only when relevant to the site's declared vertical.

---

## 8. Module Versioning

- Site definitions **pin** to a specific module version (`{ type: 'photo-text', version: 1, ... }`).
- New framework releases never silently change rendering of existing sites.
- Upgrading a site to a new module version is an **explicit operator action**, with optional preview and rollback via the platform's revision model (DOC-5).
- Multiple module versions may coexist in the framework so old sites continue to render correctly.
- Long-deprecated versions may be retired with notice and a forced upgrade path; this is rare and deliberate.

---

## 9. Technology Stack

### 9.1 Customer sites and the first-contact marketing site

- **Astro** for static rendering.
- Modules are Astro components.
- Build output is fully static HTML + assets + the generated theme CSS file + the shared site JS bundle.
- Deployed to Cloudflare via Workers Static Assets.

### 9.2 Control app (builder UI + portal)

- **Astro shell** with **React islands** for interactive surfaces.
- **Tailwind CSS** as the utility layer.
- **shadcn/ui** for component primitives (copy-paste source, no runtime cost).
- Aggressive island boundaries; lightweight state (Zustand or `useSyncExternalStore`).
- Mobile-first; CI enforces a JS payload budget and Lighthouse mobile thresholds.

### 9.3 API and platform backend

Per DOC-5: Cloudflare Workers for the API, D1 for structured product data, R2 for assets and snapshots, Queues for background jobs, Durable Objects where coordination is needed, magic links for auth, Stripe for payments.

---

## 10. Repo Structure

```
first-contact/
├── apps/
│   ├── control/          React + Astro builder UI and portal
│   └── api/              Cloudflare Worker (forms, auth, AI orchestration)
├── packages/
│   ├── framework/        Module catalog, theme system, layout primitives
│   ├── site-schema/      JSON schema + TypeScript types for site definitions
│   └── renderer/         Site-definition → static output (Astro build harness)
└── sites/
    └── first-contact/    The first-contact marketing site definition
        ├── site.json
        └── assets/
```

**Dependency direction:**

- `apps/*` depend on `packages/*`.
- `packages/renderer` depends on `packages/framework` and `packages/site-schema`.
- `packages/framework` depends only on `packages/site-schema`.
- `sites/first-contact` is data — consumed by `packages/renderer`, depends on nothing.

Customer sites do not appear in the repo. Their definitions live in D1 and are consumed at build time by the same `packages/renderer`.

---

## 11. Build & Render Pipeline

### 11.1 Common pipeline

```
Site definition (file or D1)
+ assets (file or R2)
       ↓
Renderer (Astro build harness)
       ↓
Generated static output (HTML + CSS + JS + assets)
       ↓
Cloudflare deploy (Workers Static Assets)
```

The renderer is the only component that knows whether the site definition came from a file or D1. From the module's perspective, both are identical.

### 11.2 Local development

- `wrangler dev` runs the Worker API and serves static assets with local D1/R2/KV emulators.
- The control app dev server runs alongside, proxied through the Worker for same-origin behavior.
- A single root `npm run dev` orchestrates both.

### 11.3 Deployment

- A GitHub Actions workflow on `push: branches: [xgd-stable]` deploys both the API Worker and the first-contact marketing site to Cloudflare.
- Customer site builds are triggered via the platform's own publish pipeline (Workers Static Assets per site, or shared Worker with per-site routing — to be decided in REQ).

---

## 12. Out of Scope (v1)

These are explicit non-goals for the first iteration. Some may be revisited; others are permanently out of scope.

| Item | Status |
|---|---|
| Pixel-precise positioning | Permanently out of scope |
| Art-directed asymmetric layouts | Permanently out of scope |
| Overlapping element compositions | Permanently out of scope |
| Per-site custom CSS | Out of scope v1; operator-only escape hatch may come later |
| Arbitrary AI-generated styling | Permanently out of scope |
| Customer-installable framework package | Out of scope v1 |
| Multi-page nav patterns beyond `top-tabs` | Phased — added as demand justifies |
| AI-driven module catalog extension | Out of scope v1; framework iteration is operator-led |
| Live in-browser AI editing of module source | Out of scope v1 |

---

## 13. Open Questions Carried Forward

These are not blocking v1 but should be revisited in subsequent REQs as the product matures:

1. **First showcase vertical** — DOC-5 open question; defer until first-contact site and one or two customer sites have validated the module catalog.
2. **AI intent layer** — should the AI work directly on JSON, or via a higher-level intent interpreter that translates natural-language nudges into structured edits? v1 is direct-JSON.
3. **Per-site escape hatch** — design the operator-only custom CSS facility only when accumulated framework iterations cannot absorb specific real customer needs.
4. **Site snapshot storage** — D1 vs R2 for revision snapshots (DOC-5 open question).
5. **Build trigger for customer sites** — manual operator publish vs queued background build; depends on deployment model decision.
6. **Email provider for form notifications** — DOC-5 open question; only matters when wiring lead-capture pipeline.

---

## 14. Related Tickets

- [[DOC-4]] — Product definition and vision.
- [[DOC-5]] — Platform architecture (Cloudflare/D1/R2/Workers, identity, payments, monitoring).
- First REQ ticket (forthcoming) — concrete v1 framework scope: module list for Phase 0, theme token surface, contact form lead-capture pipeline, first-contact marketing site target.
