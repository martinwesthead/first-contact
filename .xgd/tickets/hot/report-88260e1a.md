---
uid: report-88260e1a
id: REPORT-583
type: report
title: 'Report: overlap_survey for report-cda4212b'
created_by: xgd
created_at: '2026-06-27T00:28:29.207838+00:00'
updated_at: '2026-06-27T00:28:29.207838+00:00'
completed_at: null
last_field_updated: created_at
result: fail
fields:
  report_kind: overlap_survey
  subject_uid: report-cda4212b
  items:
  - index: 1
    boundary: 'Contact-form ownership: form module surface vs lead-capture submission
      pipeline'
    capability_uids:
    - capability-3630a42c
    - capability-79556c4b
    story_uids:
    - story-f1e061ba
    - story-37572647
    description: STORY-42 defines the contact-form as a content module with progressive-enhancement
      form and validator extensions. STORY-45 captures public contact-form submissions
      as leads with spam protection. Validator extensions, the rendered form markup/JS,
      the POST endpoint, and spam checks could plausibly live in either capability.
  - index: 2
    boundary: 'Public-site Worker: deployment-pipeline scaffolding vs runtime serving
      behavior'
    capability_uids:
    - capability-8bfbe75a
    - capability-474ee896
    story_uids:
    - story-067dc2f8
    - story-f632db8a
    description: STORY-38 establishes the monorepo + two-Worker Cloudflare deploy
      pipeline (which includes the public-site Worker). STORY-44 makes the public-site
      Worker serve the marketing site end-to-end via Workers Static Assets. Worker
      scaffolding, wrangler config, routes, and Static Assets binding could be assigned
      to either Platform Deployment Infrastructure (pipeline owner) or Public Site
      Delivery (runtime owner).
  - index: 3
    boundary: 'Form-submission endpoint: public-site Worker route vs lead-capture
      handler'
    capability_uids:
    - capability-474ee896
    - capability-79556c4b
    story_uids:
    - story-f632db8a
    - story-37572647
    description: STORY-44 says the public-site Worker serves the site end-to-end.
      STORY-45 implies a Worker endpoint that receives form posts and writes leads.
      Whether the POST /submit (or similar) route is owned by Public Site Delivery
      (the Worker that fronts everything public) or by Lead Capture & CRM Lite (the
      domain logic behind the route) is ambiguous.
  - index: 4
    boundary: 'CSS generation: theme-token CSS vs generator bundle CSS'
    capability_uids:
    - capability-c64bb7c7
    - capability-820fbc22
    story_uids:
    - story-e53ba4cf
    - story-d111f966
    description: CAP-33 is explicitly named 'Framework Theme Tokens & CSS Generation'
      and STORY-40 generates CSS custom properties. STORY-43's Static Site Generator
      outputs an HTML/CSS/assets bundle. The act of emitting the theme stylesheet
      and stitching it into the final bundle straddles the two — either the tokens
      story owns the artifact and the generator merely includes it, or the generator
      owns final CSS assembly and the tokens story only produces an in-memory contract.
  - index: 5
    boundary: 'Module rendering: renderers shipped with the catalog vs renderers owned
      by the generator'
    capability_uids:
    - capability-3630a42c
    - capability-820fbc22
    story_uids:
    - story-1d5b450f
    - story-f1e061ba
    - story-d111f966
    description: STORY-41 (chrome) and STORY-42 (content) define modules under a typed
      registry, with STORY-42 explicitly mentioning a progressive-enhancement form
      (rendering concern). STORY-43's generator must render modules into HTML. Whether
      module render functions ship inside the catalog (per-module renderers) or are
      implemented inside the generator (centralized renderer per module type) is unresolved.
  - index: 6
    boundary: 'Live preview implementation: builder SPA preview path vs static generator
      reuse'
    capability_uids:
    - capability-6694c60f
    - capability-820fbc22
    story_uids:
    - story-ba9f2715
    - story-d111f966
    description: STORY-46 includes a 'live preview' in the chat-driven builder SPA.
      STORY-43 is the static site generator. Live preview must render the in-progress
      site definition — either by invoking the generator (Static Site Generator owns
      the rendering pipeline used by preview) or by a SPA-side preview renderer (Builder
      UI owns its own rendering). The boundary determines code reuse and where regression
      risk sits.
---

# Cross-Capability Overlap Survey

**Clusters identified**: 6

Six plausible overlap boundaries were found across the 8-capability / 9-story matrix. Most cluster around two seams: (a) the public-site Worker (which is simultaneously a deployment-pipeline artifact, the runtime public-site delivery surface, and the host of the form-submission endpoint) and (b) the Static Site Generator (which intersects theme-token CSS generation, module rendering, and live preview).

These are flagged as *ambiguities* — not necessarily defects. Each cluster needs an explicit owning capability to prevent drift, duplicate implementation, or gaps.

## Clusters

### Cluster 1: Contact-form ownership — form module surface vs lead-capture submission pipeline
**Capabilities**: Framework Module Catalog (capability-3630a42c), Lead Capture & CRM Lite (capability-79556c4b)
**Stories**:
- story-f1e061ba (STORY-42): Framework module catalog: content modules (text-block, services-grid, contact-form) with progressive-enhancement form and validator extensions
- story-37572647 (STORY-45): Public contact-form submissions are captured as leads with spam protection and best-effort owner notification

**Overlap**: STORY-42 owns the contact-form *as a module* — rendered markup, progressive-enhancement JS, validator extensions. STORY-45 owns the *submission lifecycle* — POST handler, spam protection (Turnstile/honeypot/AI/rate-limit), lead creation, owner notification. Several artifacts are claimable by either capability: client-side field validation (validator extensions vs spam protection), the POST endpoint contract, the relationship between module schema and lead schema.

### Cluster 2: Public-site Worker — deployment-pipeline scaffolding vs runtime serving behavior
**Capabilities**: Platform Deployment Infrastructure (capability-8bfbe75a), Public Site Delivery (capability-474ee896)
**Stories**:
- story-067dc2f8 (STORY-38): Monorepo + two-Worker Cloudflare deploy pipeline
- story-f632db8a (STORY-44): Phase 0 1stcontact marketing site is served end-to-end by the public-site Worker via Workers Static Assets

**Overlap**: STORY-38 stands up the two-Worker pipeline (one of which is the public-site Worker). STORY-44 makes that public-site Worker actually serve the marketing site via Workers Static Assets. Wrangler config, route bindings, the Static Assets binding declaration, deploy-time asset bundling, and the Worker entry file could be classified under either capability. Misalignment here will cause confusion about where Worker config changes belong.

### Cluster 3: Form-submission endpoint — public-site Worker route vs lead-capture handler
**Capabilities**: Public Site Delivery (capability-474ee896), Lead Capture & CRM Lite (capability-79556c4b)
**Stories**:
- story-f632db8a (STORY-44): public-site Worker serves end-to-end
- story-37572647 (STORY-45): public contact-form submissions captured as leads

**Overlap**: STORY-44 says the public-site Worker serves everything public, end-to-end. STORY-45 needs a Worker endpoint that receives form posts. The HTTP route (e.g., `POST /api/leads` or `/submit`) physically lives in the public-site Worker but its domain behavior is Lead Capture. Where the route file is mounted, who owns the request-parsing/CSRF/Turnstile-verification layer vs the lead-write layer is ambiguous.

### Cluster 4: CSS generation — theme-token CSS vs generator bundle CSS
**Capabilities**: Framework Theme Tokens & CSS Generation (capability-c64bb7c7), Static Site Generator (capability-820fbc22)
**Stories**:
- story-e53ba4cf (STORY-40): Theme tokens generate CSS custom properties with defaults, dark mode, and a vetted fonts shortlist
- story-d111f966 (STORY-43): Static site generator turns a validated site definition into a deployable HTML/CSS/assets bundle

**Overlap**: CAP-33's name explicitly includes "CSS Generation". STORY-43's generator also produces CSS as part of the deployable bundle. Whether the theme-tokens story emits its own CSS artifact (and the generator merely embeds it) or whether the generator owns the final CSS pipeline (and the tokens story only supplies an in-memory token map) is unresolved. The dark-mode and `@font-face` emission likewise straddles the seam.

### Cluster 5: Module rendering — renderers shipped with the catalog vs renderers owned by the generator
**Capabilities**: Framework Module Catalog (capability-3630a42c), Static Site Generator (capability-820fbc22)
**Stories**:
- story-1d5b450f (STORY-41): chrome modules (header, hero, footer) under a typed registry
- story-f1e061ba (STORY-42): content modules with progressive-enhancement form and validator extensions
- story-d111f966 (STORY-43): Static site generator turns validated definitions into HTML/CSS bundles

**Overlap**: A typed module registry (STORY-41/42) can either (a) ship per-module render functions that the generator looks up by type, or (b) ship only the schema/contract while the generator implements a switch-on-type renderer. STORY-42's mention of a "progressive-enhancement form" is rendering-output language, hinting at option (a). STORY-43's "turns site definition into HTML" hints at option (b). Both stories could grow rendering code unless the boundary is set.

### Cluster 6: Live preview implementation — builder SPA preview path vs static-generator reuse
**Capabilities**: Builder UI (capability-6694c60f), Static Site Generator (capability-820fbc22)
**Stories**:
- story-ba9f2715 (STORY-46): Chat-driven site builder SPA with live preview, AI tool validation, and Anthropic proxy
- story-d111f966 (STORY-43): Static site generator (programmatic API and CLI)

**Overlap**: STORY-46's "live preview" must convert an in-progress site definition into rendered output. Two valid placements: (a) the Builder UI invokes the static generator's programmatic API to produce preview HTML/CSS, in which case the rendering pipeline is fully owned by CAP-35 and reused by CAP-38; or (b) the SPA implements its own client-side preview renderer, in which case CAP-38 grows a parallel rendering surface. Without an explicit decision, both capabilities may grow renderer code independently.
