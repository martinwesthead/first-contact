---
uid: comment-e1d336e6
id: COMMENT-1
type: comment
title: Comment on request REQ-3
created_by: xgd
created_at: '2026-06-12T23:30:20.277170+00:00'
updated_at: '2026-06-12T23:55:23.658315+00:00'
completed_at: null
last_field_updated: body
status: null
fields:
  subject_uid: request-bf2298ab
  kind: chat_transcript
---

*Captured from dashboard chat CHAT-7 (chat-9223ebdc) — paraphrased excerpts of the design discussion specifically relevant to this ticket. Full session transcript lives on CHAT-7.*

<!-- xgd-chat role="user" ts="2026-06-12T21:40:00.000Z" -->
#### You

So I think we need an architecture document (DOC ticket) that captures these principles specifically and then a REQ ticket for the first iteration of the framework. What are the big open questions we need to resolve before we can go there?

<!-- xgd-chat role="assistant" ts="2026-06-12T21:42:00.000Z" -->
#### Claude

Open questions grouped by what they block.

**Must resolve to write the DOC well:**
1. Static rendering technology — Astro lean.
2. Module authoring format — follows from (1).
3. Framework's public surface — library customers install, service they never see, or both (lean: both, but framework consumed by control plane on customer's behalf).
4. Module contract — formal interface every module implements; needs the shape, not full detail.
5. Repo structure — monorepo vs separate.

**Must resolve to write the REQ:**
6. Phase 0 module list.
7. Lead-capture pipeline depth — email-only / D1 + email / full CRM. Lean (b).
8. Theme token surface.
9. Hosting + domain.
10. First-vertical anchor (deferrable).

<!-- xgd-chat role="user" ts="2026-06-12T22:00:00.000Z" -->
#### You

1. Astro is what I have used before.
   1. What makes most sense as a module? Astro component?
   2. Customers never see the framework — AI must be fluent in it.
   3. (Module contract) — you tell me.
   4. Repo contains the first-contact app and associated web pages. Maintained on github. Should use the same constraints/framework as customer sites. Customer sites stored in D1 and created with FC.

<!-- xgd-chat role="assistant" ts="2026-06-12T22:05:00.000Z" -->
#### Claude

Astro confirmed. Module = Astro component — Astro maps 1:1: props are config, scoped styles are token-driven CSS, Astro Islands hold client JS, static rendering by default.

Framework is internal — not published to npm; AI's "vocabulary" is the catalog + dial set + token surface, not the framework code.

**Module contract proposal:**

```typescript
export const moduleMeta = {
  id: 'photo-text',
  version: 1,
  variants: ['image-left', 'image-right', 'stacked'] as const,
  dials: {
    size:  ['sm','md','lg'],
    shape: ['square','rounded','circle'],
    align: ['left','center','right'],
    spacingTop:   ['none','sm','md','lg','xl'],
    spacingBottom:['none','sm','md','lg','xl'],
    surface:      ['default','subtle','inverse','accent'],
  },
  contentSchema: {
    heading: { type: 'string',    required: false },
    body:    { type: 'markdown',  required: true },
    image:   { type: 'asset-ref', required: true },
  },
} as const;
```

Contract rules:
- Every module exports moduleMeta with id, version, variants, dials, contentSchema.
- All variants and dials are finite enumerations — no free-form values.
- Module CSS is fully scoped, classes only, no inline styles.
- All tunables flow through CSS custom properties + dial class names.
- Modules never read site state outside their own props.
- Modules render the same in files (FC) and from D1 (customer sites).

**Repo:** monorepo. The renderer reads site-definition from either file (sites/) or D1 — same module catalog, no divergent paths.

Two consumption paths, one framework. This is the architectural property that lets the same `packages/site-schema` types and validator cover both surfaces.

<!-- xgd-chat role="user" ts="2026-06-12T22:25:00.000Z" -->
#### You

generated file / pin (auto-upgrade would be crazy) / inline / AI edits the json directly

<!-- xgd-chat role="assistant" ts="2026-06-12T22:26:00.000Z" -->
#### Claude

Locked: theme-token CSS = generated file. Module versioning = pin, explicit upgrade only. Per-instance dials = inline in page composition `{type, variant, dials, content}`. AI interaction = direct structured edits to the site-definition JSON.

These four decisions together fix the contract `site-schema` has to encode: the schema validates the structural shape of Site / Page / ModuleInstance / ThemeTokens, but NOT catalog membership (whether a given `type` is a real module, or whether a given variant/dial is valid for that module). Catalog correctness is the framework's job at render time using each module's `moduleMeta`. The schema is structure; the framework is catalog. That separation is what makes the schema cheap to evolve and the catalog free to grow without schema migrations.

<!-- xgd-turn id="aaedea58-27ff-48ec-bbff-7c8ab6715f1a-user" -->

<!-- xgd-chat role="user" ts="2026-06-12T23:32:24.154Z" -->
#### You
Do you have the context to go ahead and free code this ticket

<!-- xgd-turn id="aaedea58-27ff-48ec-bbff-7c8ab6715f1a-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-12T23:33:18.514Z" -->
#### Claude
I want to check the repo state and identify any genuine ambiguities before saying yes.

Yes, mostly — the scaffold is in place (`packages/site-schema/` exists from REQ-1, vitest configured, monorepo wired). Ticket scope, prior-context decisions, and DOC-7 cover most shape questions.

One genuine ambiguity worth confirming before I commit code, since "wrong now = schema migration later":

**Theme token slot list.** DOC-7 §4 names *categories* (palette, type family, type scale, spacing scale, radius, shadow, container, breakpoints) but no specific slot names. The ticket says "every token slot defined in DOC-7 §4 is present" — but they aren't defined there. I'd propose:

- `palette`: `primary`, `accent`, `fg`, `bg`, `surface`, `surfaceSubtle`, `surfaceInverse`, `border`, `muted` (hex strings)
- `typography.family`: `heading`, `body` (CSS font-family stacks)
- `typography.scale`: `xs`, `sm`, `base`, `lg`, `xl`, `2xl`, `3xl`, `4xl` (CSS length strings)
- `spacing`: `none`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl` (matches the dial spacing enum in DOC-7 §3.1)
- `radius`: `none`, `sm`, `md`, `lg`, `full`
- `shadow`: `none`, `sm`, `md`, `lg`
- `container.maxWidth`: single value
- `breakpoints`: `sm`, `md`, `lg`, `xl` (CSS length strings)

A few smaller decisions I'd make without asking unless you push back:
- Each `ModuleInstance` carries an `id` (required, unique within page) — needed for nav anchors per DOC-7 §5.
- `NavEntry.target` discriminated by `kind: 'page' | 'anchor' | 'url'`.
- `AssetRef`: `{ id, src, alt, focalPoint?: { x: 0-1, y: 0-1 } }`.
- `MarkdownString` is a branded `string` at type level, plain string at runtime.
- Hex color = `#rgb` / `#rrggbb` / `#rrggbbaa`.
- Module ID uniqueness *within page* and page slug uniqueness *within site* are structural (in schema, per DOC-7 §6.5 layer 1).

Shall I proceed with the slot list above, or do you want to adjust it?

<!-- xgd-turn id="b7db3d8e-67ab-4466-a361-1a56282f566a-user" -->

<!-- xgd-chat role="user" ts="2026-06-12T23:55:02.297Z" -->
#### You
That sounds fine

<!-- xgd-chat-end -->