---
uid: comment-a2903c1b
id: COMMENT-6
type: comment
title: Comment on doc DOC-8
created_by: xgd
created_at: '2026-06-12T23:36:37.565870+00:00'
updated_at: '2026-06-12T23:36:39.165440+00:00'
completed_at: null
last_field_updated: body
status: null
fields:
  subject_uid: doc-1e7bb6ac
  kind: chat_transcript
---

<!-- xgd-cli-session ts="2026-06-12T23:36:33Z" model="claude-opus-4-7" continued_from="new" -->
*Captured by CLI Claude — paraphrased reconstruction from session memory, not raw capture.*

<!-- xgd-chat role="user" ts="2026-06-12T20:24:41.147Z" -->
#### You
Please read DOC-4 and DOC-5 - in this conversation I would like us to discuss the site builder interface - this will take the XGD chat panel as it exists today have that on the left and then a panel on the right that builds the live site. An adjustable slider between the two will allow the panels to resize. The chat panel (left) should have a cheveron collapse down to a narrow vertical bar that can be clicked to reopen just like the list panel on XGD.

You can refer to xgd code and tickets in ../xgendev-main

<!-- xgd-chat role="assistant" ts="2026-06-12T20:24:41.147Z" -->
#### Claude
Confirmed: the XGD `#chat-list-panel` minimize/restore pattern (32px vertical bar, restore chevron, draggable splitter, localStorage-persisted width) is exactly the model — just inverted (chat on the left, preview on the right).

Two foundational questions shape everything downstream:

**1. Where does this UI live?** DOC-5 calls for a separate "GenDev Labs control application frontend" hosted on Cloudflare Workers Static Assets — a different surface from the XGD operator dashboard. So we'd be building a new app, reusing the visual pattern from XGD but not the code. Alternative: prototype inside the XGD dashboard for speed, port later. The first commits us to target architecture; the second is faster but throwaway.

**2. What does the right panel actually render?** This is load-bearing:
- **Iframe of preview build** — truest "see what will ship"; build round-trip per change. DOC-5's "live preview sessions" Durable Objects anticipate this.
- **In-browser render of site definition** — instant feedback; renderer must be portable enough to run in both builder and static generator.
- **Hybrid** — in-browser for structural changes, iframe rebuild on demand.

The chat-side commitment is also non-trivial: the chat must produce *structured changes* (theme tokens, section reorder, content blocks) — not arbitrary HTML. So this isn't just "wire up a chat panel"; the chat has to be backed by an AI orchestration layer that emits site-definition diffs the renderer can consume.

Decide (2) first — render strategy drives the data flow between chat and preview.

<!-- xgd-chat role="user" ts="2026-06-12T20:54:30.305Z" -->
#### You
1 - yes this is a new app - it will be part of the "first-contact" (name of the product) website unlike XGD it will be out there in the public facing internet.
2 - tell me more about the delays and the complexity of in-browser rendering? You can take a look at the chat called "Framework" we are starting to discuss there what the web framework will look like - that conversation may (obviously) inform this one and visa versa

<!-- xgd-chat role="assistant" ts="2026-06-12T20:54:30.305Z" -->
#### Claude
Given Framework chat's commitment to **fixed section library + theme tokens + content JSON**, in-browser render is essentially free.

**Why it's borderline free:**
- The renderer is a JS module: imports the section library, takes a JSON definition, writes DOM. Same code as the static generator.
- Theme changes are CSS-variable flips — sub-frame.
- Content edits re-render only the affected module.
- Section reorder is array reorder.
- No build step. No network round-trip. Render time for ~10 sections is well under a frame.

**Three real complexities, none deal-breakers:**
1. **CSS / style isolation** between builder chrome and preview — solve with a same-origin `<iframe>`. Builder calls `iframe.contentDocument` directly; no postMessage gymnastics. ~20 lines of plumbing.
2. **Section-library distribution** — same ESM modules consumed by both the static generator and the builder. Static-gen ↔ builder convergence is natural under the Framework design; don't let them diverge.
3. **Strict, versioned site-definition JSON schema**, validated at every boundary (AI output, builder state, generator input).

**Where iframe-of-built-site is still useful:** as a "verify what ships" sanity check button, NOT the main loop. One button: render via real `tools/generate`, open in new tab. Off the critical edit path.

Iframe-rebuild-on-every-change buys nothing in this architecture because the live renderer IS the production renderer. The Durable Objects "live preview sessions" line in DOC-5 is better repurposed for **session state** (multi-user, chat history, undo) than build queueing.

**Net recommendation:**
- Main loop: in-browser render into a sandboxed same-origin iframe.
- Pipeline: `siteDefinition (JSON) → sectionLibrary[type].render(props, themeTokens) → DOM`. Same module path used by the static generator.
- Schema: lock JSON shape early; validate at AI output, builder state, generator input.
- Production-fidelity check: "view as built" button hitting a Worker preview build. Optional, off the critical path.

Feeds back into Framework chat: the structured-changes-only AI edits rule is what makes in-browser render trivial. If the framework loosens that — letting AI inject custom CSS or HTML — the in-browser path gets messier and iframe-build starts looking better.

<!-- xgd-chat role="user" ts="2026-06-12T22:33:57.663Z" -->
#### You
ok great. Now check out the new architecture doc and revisit "Framework" chat it has grown and then ready Chat-10. Then lets talk - does this work need an arch doc or can we go straight to a REQ, or could we add it to the framework doc?

<!-- xgd-chat role="assistant" ts="2026-06-12T22:33:57.663Z" -->
#### Claude
DOC-7 already covers ~70% of the builder's architectural frame:
- §9.2 — Astro + React islands, Tailwind, shadcn, mobile-first, CI payload budget
- §10 — `packages/builder-ui` is a defined package
- §6 — AI edits structured JSON only; §6.2 is literally the AI's edit surface
- §3 — module contract is the schema the AI manipulates
- §4 — theme tokens are part of that schema

**Three durable decisions are NOT in DOC-7 and don't belong in a REQ** (because they'll shape every future builder REQ):
1. **Live preview is in-browser render**, not build-and-iframe. Locks in a framework property: the module renderer must be invocable in-browser by `packages/builder-ui`, with no build round-trip on edit.
2. **Chat → AI → structured-diff → state → renderer pipeline shape.** Durable contract; once set, downstream REQs slot into it.
3. **AI tool surface = DOC-7 §6.2.** Worth pinning explicitly so it doesn't drift.

**Three options:**
- **A.** Straight to REQ. Cheapest. Risk: builder spans 5+ REQs and principles get re-litigated each iteration.
- **B.** Small amendment to DOC-7 + REQ. Risk: scope leak; DOC-7's scope is the rendering framework, builder is a consumer.
- **C.** New DOC-8 (builder principles) + one-line DOC-7 amendment (renderer is in-browser invocable) + REQ.

**Recommend C:**
- Builder will span many REQs (v1 chat, v2 portal/dashboard, AI tool surface evolution).
- DOC-7's scope is the framework; builder is a consumer. Keeping them separate matches the package boundary (`packages/framework` vs `packages/builder-ui`).
- The three durable items are short — DOC-8 would be tight, probably half the length of DOC-7.

<!-- xgd-chat role="user" ts="2026-06-12T22:57:52.100Z" -->
#### You
I was thinking that there should be some mechanical validation of the JSON edits before publication

<!-- xgd-chat role="assistant" ts="2026-06-12T22:57:52.100Z" -->
#### Claude
Strongly agree — and load-bearing enough to change the doc shape.

**Why mechanical validation is the linchpin:** the whole architecture pivots on "AI emits structured edits." That bet only pays off if **invalid edits are mechanically impossible to ship**. Without a hard validation gate: a bad dial value escapes to D1 and crashes render; an `asset-ref` to a deleted image silently breaks layout; AI mishearing a dial enum corrupts state; framework upgrades quietly invalidate older stored definitions; a clever content field smuggles HTML/CSS past §6.3's forbidden list. Validation is what makes "structured changes only" a real guarantee instead of an aspiration.

**What mechanical validation can actually check** (deterministic, sub-100ms, no I/O):
1. **Schema conformance** — site definition matches `packages/site-schema`. JSON Schema or Zod. Required fields present, types correct, no unknown keys.
2. **Module-meta conformance** — for each module instance: `type` exists at `version`; `variant` ∈ `moduleMeta.variants`; every dial value ∈ `moduleMeta.dials[name]`; content fields match `moduleMeta.contentSchema`.
3. **Theme-token conformance** — every set token is in the framework's contract; values pass type checks.
4. **Referential integrity** — every `asset-ref` resolves; every nav entry points at a real page or anchor; every module ID referenced in nav exists.
5. **Uniqueness / structure** — module IDs unique within a page; page slugs unique within a site; nav non-circular.
6. **Content-field safety** — markdown fields don't contain inline `<style>`/`<script>`/raw HTML beyond what the renderer allows; URL fields well-formed.
7. **Render smoke** — `tools/generate` can render without throwing. Fast no-output dry run, optional.

**Where the gate sits — four layers, same validator:**
- **AI tool call**: each structured edit validated against state + framework catalog *before* applying. Reject and ask AI to retry.
- **Builder state**: refuses to write an invalid definition into local state.
- **Save to D1**: control-app Worker re-validates server-side before persisting. Defense in depth.
- **Build / publish**: `tools/generate` validates before render. Catches drift after framework upgrades.

One function: `validate(siteDefinition, frameworkCatalog) → Result`. Lives in `packages/site-schema`. Consumed by all four layers — same code, same rules. Drift between layers is the only way invalid data ships; collapse that drift with one validator.

**Cost worth naming:** the AI-tool-call gate has retry cost. Mitigations: schema in system prompt; errors machine-readable (`{ path: 'modules[2].dials.shape', expected: ['square','rounded','circle'], got: 'cirle' }`) so AI fixes precisely; tight schema descriptions for common errors. Empirically, with a well-described schema, retry rates stay in low single digits.

**Implication for doc shape:** mechanical validation is both
- a **framework guarantee** — part of "structured changes only" actually being safe. Belongs in DOC-7.
- a **builder principle** — the chat loop's feedback mechanism depends on it. Belongs in DOC-8.

Concretely:
- **DOC-7** gets a new section: "Mechanical validation is a framework guarantee. The framework provides a single validator over `(siteDefinition, catalogVersion) → Result`. No code path may write to D1 or render without it." Lists the validation categories.
- **DOC-8** describes the AI-loop side: tool calls validate before state apply; AI receives structured errors; retry contract.

Still recommend Option C — build DOC-8 separately; the DOC-7 amendment makes the validator a first-class framework commitment so every consumer (builder, generator, future API clients) depends on the same validator existing.

<!-- xgd-chat role="user" ts="2026-06-12T23:01:53.776Z" -->
#### You
ok please create DOC-8

<!-- xgd-chat role="assistant" ts="2026-06-12T23:01:53.776Z" -->
#### Claude
Created DOC-8 — Builder UI Architecture Principles. Captures:

- Two-panel layout with the XGD chat-list-panel collapse pattern (32px bar + chevron, draggable splitter, localStorage state).
- Live preview as in-browser render via `packages/framework`, no build round-trip on edit.
- Same-origin iframe for CSS isolation; viewport-switching presets (375 / 768 / 100%) for mobile verification.
- Chat → AI → diff → state → render pipeline with state as single source of truth.
- AI tool surface = 1:1 with DOC-7 §6.2; forbidden actions enforced by absence-of-tool.
- Four-layer mechanical validation gate, one shared validator from `packages/site-schema`.
- State persistence in Zustand-or-equivalent; per-session undo/redo on the diff log.
- Desktop-first builder, mobile-first sites — distinction made explicit.
- Permanently-out-of-scope: raw JSON edit mode (rationale: undermines structured-edit guarantee end-to-end).
- Open questions deferred to REQ-time (diff visualization, autosave cadence, streaming AI responses, asset upload flow, tool-call batching, intent layer).

Outstanding from the discussion:
1. DOC-7 amendment — explicit framework-side commitment that the module renderer is invocable in-browser; make mechanical validator a first-class framework guarantee.
2. Builder v1 REQ — Phase 0 scope (two-panel layout, iframe preview, first AI tool subset, validator wiring, save-to-D1 for `sites/1stcontact`). Depends on validator REQ landing first.

<!-- xgd-chat-end -->