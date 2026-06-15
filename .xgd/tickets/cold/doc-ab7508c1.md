---
uid: doc-ab7508c1
id: DOC-7
type: doc
title: Website Framework Architecture Principles
created_by: xgd
created_at: '2026-06-12T22:12:47.112839+00:00'
updated_at: '2026-06-12T23:04:53.228444+00:00'
completed_at: null
last_field_updated: body
status: null
fields:
  doc_kind: architecture
---

# 1st Contact Website Framework — Architecture Principles

## 1. Purpose & Scope

This document captures the durable architectural principles for the 1st Contact website framework: the shared engine that renders both the 1st Contact marketing site and all customer sites built on the platform.

It is paired with [[DOC-4]] (product vision) and [[DOC-5]] (platform architecture). DOC-5 covers the platform-wide Cloudflare/D1/R2/Workers shape; this doc covers the framework specifically — how a site is modeled, rendered, and evolved.

**This document commits to:**

- A module-based composition model.
- A strictly structured-change discipline: AI edits site definitions as data, never as code or CSS.
- A finite, evolving catalog of modules with bounded per-instance flexibility.
- One framework, two consumption paths: file-backed (1st Contact's own marketing site) and D1-backed (customer sites).
- One renderer, two execution contexts: build-time (static generation) and in-browser (live preview in the builder).
- A single mechanical validator that enforces the structured-edit discipline at every layer.
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
| **File-backed** | JSON files under `sites/<name>/` in the repo | 1st Contact's own marketing site; showcase sites; offline development |
| **D1-backed** | Records in the Cloudflare D1 product database | All customer sites created via the platform |

The renderer accepts either source via a common interface. Module rendering is identical in both cases — there are no divergent code paths.

### 2.3 The module is the unit of reuse

Modules are the atomic unit of visual composition. A module is not a snippet of HTML or a CSS class — it is a versioned, contract-bound Astro component. The catalog of available module types is closed at any given framework version; it grows only through deliberate framework iteration (see §7).

### 2.4 Renderer is invocable in two execution contexts

The renderer — the module catalog plus the theme system as packaged in `packages/framework` — is invocable in two execution contexts:

| Context | Where | Use |
|---|---|---|
| **Build-time** | Node / Worker, via `tools/generate` | Produces static HTML + CSS + JS for production deploy |
| **In-browser runtime** | Browser, via `packages/framework` imported as ESM into the control app | Powers the builder's live preview ([[DOC-8]] §3.1) |

Rendered output is identical in both contexts. This is the architectural commitment that lets the chat-driven builder show truly live preview without a build round-trip: **the in-browser preview IS the production renderer.**

Implications for the framework package:

- It MUST be importable as ESM directly in the browser, with no Node-only dependencies on the rendering path.
- It MUST NOT rely on a build step to be functional; any Astro-build-only convenience is permitted only on top of browser-callable primitives.
- Asset reference resolution must work through a context-agnostic interface so the same module code resolves `sites/<name>/assets/` paths (build) and R2-served URLs (runtime).

This applies to the renderer only. The control app and `tools/generate` may use Node-only tooling — but `packages/framework` itself stays browser-compatible.

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

The phased delivery order is `in-page-anchors` and `top-tabs` first (sufficient for 1st Contact's own site and most service businesses), with the remainder added as customer demand justifies. All patterns are implemented in the shared library; per-site customization is limited to choice of pattern, entry labels, and entry order.

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

### 6.5 Mechanical validation contract

The discipline in §6.1–§6.3 is enforced mechanically by a single validator owned by `packages/site-schema`:

```
validate(siteDefinition, frameworkCatalog) → Result
```

The validator is **deterministic, synchronous, and fast** — runs in well under a frame for typical sites (a few hundred module instances or fewer). It performs no I/O.

What it checks:

1. **Schema conformance** — the site definition matches the published JSON schema: required fields present, types correct, no unknown keys.
2. **Module-meta conformance** — every module instance's `type` exists in the catalog at the pinned `version`; `variant` is in `moduleMeta.variants`; every dial value is in `moduleMeta.dials[name]`; content fields match `moduleMeta.contentSchema`.
3. **Theme-token conformance** — every set token name exists in the framework's contract; values pass type checks for their token kind (color, scale step, breakpoint, etc.).
4. **Referential integrity** — every `asset-ref` resolves; every nav entry's target page or anchor exists; module IDs referenced from nav exist.
5. **Uniqueness and structure** — module IDs unique within a page; page slugs unique within a site; nav entries non-circular.
6. **Content-field safety** — content fields do not contain inline `<style>` / `<script>` or raw HTML beyond what the framework's content type for that field permits; URL fields are well-formed.

Validation failures return **machine-readable** errors so AI callers can self-correct:

```json
{
  "tool": "set_module_dial",
  "path": "modules[2].dials.shape",
  "expected": ["square", "rounded", "circle"],
  "got": "cirle"
}
```

The validator is consumed at **four layers**, every layer using the same code and the same rules:

| Layer | Owner | Where in the system | On failure |
|---|---|---|---|
| 1. AI tool call | Builder UI | Pre-state-apply | Reject; structured error to AI; AI retries within turn |
| 2. Builder state | Builder UI | State store | Refuse to ingest invalid definition |
| 3. Save to D1 | `control-app` Worker | Server-side, pre-persist | 4xx; client surfaces error |
| 4. Build / publish | `tools/generate` | Pre-render | Block publish; operator-facing error |

**No code path may write a site definition to D1, render it for production, or apply it to builder state without passing the validator.** This is the guarantee that turns "structured changes only" from an aspiration into a property. Drift between layers is the single failure mode it must prevent — which is why the validator is *shared*, not duplicated, across consumers.

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

### 7.4 Graceful degradation through `text-block`

Until a dedicated module exists for a given content shape, structured prose in the `text-block` module is the canonical fallback. Because `text-block`'s body field is markdown, it can carry rich content — images, lists, links, sub-headings — and serve as an "article-style" stand-in for content that will eventually warrant a dedicated module (about pages, FAQ-as-prose, terms, manifestos, founder notes).

This is deliberate, not a workaround. It means:

- **Nothing is blocked** waiting for the perfect module to exist.
- **Catalog gaps surface as observable patterns** — repeated text-block use for the same content shape is the signal to design a dedicated module, and the existing text-block content informs the new module's contract.
- **Two valid visual outcomes are preserved.** A text-block-about reads as "a personal note from the founder." A future `about` module reads as "a designed about section." Both are legitimate; the distinction itself has product value.

Operators and AI should reach for `text-block` for any prose-shaped content while the catalog matures, without treating it as a compromise.

---

## 8. Module Versioning

- Site definitions **pin** to a specific module version (`{ type: 'photo-text', version: 1, ... }`).
- New framework releases never silently change rendering of existing sites.
- Upgrading a site to a new module version is an **explicit operator action**, with optional preview and rollback via the platform's revision model (DOC-5).
- Multiple module versions may coexist in the framework so old sites continue to render correctly.
- Long-deprecated versions may be retired with notice and a forced upgrade path; this is rare and deliberate.

---

## 9. Technology Stack

### 9.1 Customer sites and the 1st Contact marketing site

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

The API is not a separate Worker — instead, public-facing endpoints live on the `public-site` Worker (form submission, magic-link initiation) and authenticated endpoints live on the `control-app` Worker (CRUD on site definitions, leads, customers, AI orchestration). This keeps the boundary between public and authenticated surfaces at the Worker level rather than as application-layer middleware.

---

## 10. Repo Structure

```
1stcontact/
├── apps/
│   ├── public-site/       Cloudflare Worker for 1stcontact.io
│   │                      (serves the marketing site + public form/API endpoints)
│   └── control-app/       Cloudflare Worker for app.1stcontact.io
│                          (serves the builder/portal SPA + authenticated API endpoints)
├── packages/
│   ├── framework/         Module catalog, theme system, layout primitives
│   ├── site-schema/       JSON schema + TypeScript types + validator for site definitions
│   ├── builder-ui/        React components for the chat builder + portal
│   └── ui-kit/            Shared design-system components (shadcn-based)
├── sites/
│   └── 1stcontact/        The 1st Contact marketing site definition
│       ├── site.json
│       └── assets/
├── tools/
│   └── generate/          Static generator: site-def → static output
└── db/
    └── migrations/        D1 schema migrations
```

**Dependency direction:**

- `apps/public-site` depends on `tools/generate` (build-time) and `packages/framework`.
- `apps/control-app` depends on `packages/builder-ui`, `packages/ui-kit`, `packages/framework` (for in-browser preview rendering per §2.4), and `packages/site-schema` (for the validator).
- `tools/generate` depends on `packages/framework` and `packages/site-schema`.
- `packages/builder-ui` depends on `packages/ui-kit`, `packages/site-schema`, and `packages/framework` (in-browser renderer).
- `packages/framework` depends only on `packages/site-schema`.
- `packages/site-schema` is the canonical home of the validator (§6.5) and depends on nothing.
- `sites/1stcontact` is data — consumed by `tools/generate`, depends on nothing.

Customer sites do not appear in the repo. Their definitions live in D1 and are consumed at build time by the same `tools/generate` static generator.

**Two-Worker split rationale:**

- `public-site` serves `1stcontact.io/*` — the marketing site assets *and* public-facing endpoints (form submission, magic-link request initiation, Stripe webhook intake for public flows).
- `control-app` serves `app.1stcontact.io/*` — the authenticated builder/portal SPA assets *and* authenticated API endpoints (CRUD on site definitions, leads, customers, AI orchestration).
- Independent rollback. The public site stays up if the control app is being rebuilt and vice versa.

---

## 11. Build & Render Pipeline

### 11.1 Common pipeline

```
Site definition (file or D1)
+ assets (file or R2)
       ↓
tools/generate (Astro build harness)
       ↓
Generated static output (HTML + CSS + JS + assets)
       ↓
Cloudflare deploy (Workers Static Assets)
```

`tools/generate` is the only component that knows whether the site definition came from a file or D1. From the module's perspective, both are identical.

Per §2.4, this is one of two execution contexts for the renderer. The other — in-browser invocation by `packages/builder-ui` for live preview — uses the same `packages/framework` directly, without `tools/generate` in the path. Build-time output and in-browser preview are produced by the same module code.

### 11.2 Local development

- `wrangler dev` runs the Worker API and serves static assets with local D1/R2/KV emulators.
- The control app dev server runs alongside, proxied through the Worker for same-origin behavior.
- A single root `npm run dev` orchestrates both.

### 11.3 Deployment

- A GitHub Actions workflow on `push: branches: [xgd-stable]` deploys both Workers — `public-site` (1stcontact.io) and `control-app` (app.1stcontact.io) — to Cloudflare. Each is deployable independently.
- Customer site builds are triggered via the platform's own publish pipeline (Workers Static Assets per site, or shared Worker with per-site routing — to be decided in a later REQ).

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

1. **First showcase vertical** — DOC-5 open question; defer until 1st Contact site and one or two customer sites have validated the module catalog.
2. **AI intent layer** — should the AI work directly on JSON, or via a higher-level intent interpreter that translates natural-language nudges into structured edits? v1 is direct-JSON.
3. **Per-site escape hatch** — design the operator-only custom CSS facility only when accumulated framework iterations cannot absorb specific real customer needs.
4. **Site snapshot storage** — D1 vs R2 for revision snapshots (DOC-5 open question).
5. **Build trigger for customer sites** — manual operator publish vs queued background build; depends on deployment model decision.
6. **Email provider for form notifications** — DOC-5 open question; only matters when wiring lead-capture pipeline.

---

## 14. Related Tickets

- [[DOC-4]] — Product definition and vision.
- [[DOC-5]] — Platform architecture (Cloudflare/D1/R2/Workers, identity, payments, monitoring).
- [[DOC-8]] — Builder UI architecture principles (chat-left / preview-right layout, in-browser preview, chat → AI → diff → state → render pipeline, AI tool surface, validator consumption).
- First framework REQ (forthcoming) — concrete v1 framework scope: module list for Phase 0, theme token surface, contact form lead-capture pipeline, 1st Contact marketing site target.
- Validator REQ (forthcoming) — concrete v1 validator scope per §6.5: schema, module-meta, theme-token, referential integrity, uniqueness, content-field safety. Shipped before or alongside the first builder REQ.
