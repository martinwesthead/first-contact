---
uid: doc-1e7bb6ac
id: DOC-8
type: doc
title: Builder UI Architecture Principles
created_by: xgd
created_at: '2026-06-12T23:01:37.379482+00:00'
updated_at: '2026-06-12T23:01:37.379482+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  doc_kind: architecture
---

# 1st Contact Builder UI — Architecture Principles

## 1. Purpose & Scope

The chat-driven site builder is the primary interface where AI proposes structured site-definition edits and the operator watches the site build itself. This document captures the durable architectural principles for that surface.

It is paired with:

- [[DOC-4]] — product vision
- [[DOC-5]] — platform architecture (Cloudflare/D1/R2/Workers)
- [[DOC-7]] — framework architecture principles (the renderer, module contract, structured-edit discipline)

**This document commits to:**

- A two-panel layout: collapsible chat on the left, live preview on the right, with a draggable splitter.
- Live preview via **in-browser rendering** using `packages/framework`, never a build round-trip on edit.
- A canonical pipeline: **chat → AI → structured-diff → state → renderer**.
- The AI's tool surface mirrors [[DOC-7]] §6.2's allowed-edits list exactly.
- The same-origin sandboxed iframe pattern for CSS / style isolation between builder chrome and preview.
- Enforcement of the four-layer mechanical validation gate defined in [[DOC-7]].

**This document deliberately does not commit to:**

- Specific AI tool call schemas (defined in REQ tickets per iteration).
- Specific chat UI components, message rendering, attachment shapes (REQ-scope).
- Auth flow specifics (covered by [[DOC-5]] magic-link model).
- Portal / dashboard / CRM surfaces beyond the chat builder (later DOCs and REQs).
- Diff visualization or "inspector" UIs (carried forward as open questions).

---

## 2. Layout

### 2.1 Two-panel composition

```
┌────────────┬─┬──────────────────────┐
│            │ │                      │
│  Chat      │S│   Live Preview       │
│  Panel     │p│   (iframe)           │
│            │l│                      │
│            │i│                      │
│            │t│                      │
│            │ │                      │
└────────────┴─┴──────────────────────┘
```

Chat panel left, preview right, draggable splitter between them. The chat panel collapses to a 32px vertical bar with a restore chevron, mirroring the proven XGD list-panel pattern (`#chat-list-panel` in the XGD dashboard).

Panel widths and collapsed state persist in `localStorage`.

### 2.2 Panel state model

- **Chat panel**: `open` or `collapsed` (32px vertical bar with restore chevron).
- **Preview panel**: always present; expands to fill space when chat is collapsed.
- **Splitter**: visible only when chat is open; hidden when chat is collapsed.
- **Restore action**: clicking the collapsed bar restores chat to its previous width, or 25% of the container if no remembered width exists.

### 2.3 Rationale

Chat-driven work alternates between wanting all the screen for the conversation and wanting all the screen for the result. Persistent collapse + drag-resize covers both modes with one mechanism — no separate "preview-only" or "chat-only" view to maintain.

---

## 3. Live Preview Rendering

### 3.1 In-browser, not build-and-iframe

The preview panel renders the current site definition live in the browser by invoking `packages/framework` as a JavaScript module. No build step runs on the edit path.

Rationale:

- The same renderer is used by `tools/generate` to produce production output. Because both consume the framework as the same package, live preview cannot drift from production rendering — they are the same code.
- No network round-trip on edit; preview feedback is sub-frame.
- Theme token changes are CSS-custom-property flips.
- Content edits re-render only the affected module instance.
- Module reordering is array reorder.

This is the architectural commitment that locks in [[DOC-7]]'s requirement that the framework module renderer be invocable in-browser.

### 3.2 Same-origin sandboxed iframe

The preview lives inside a same-origin `<iframe>`. The builder controls it via `iframe.contentDocument` directly — no `postMessage` protocol.

Rationale:

- **CSS isolation**: theme tokens and module styles do not leak into builder chrome; builder Tailwind / shadcn styles do not leak into the preview.
- The iframe inherits exactly the framework's own CSS reset and token system, identical to a published site.
- Same-origin access is sufficient: the preview content is operator-controlled, not arbitrary user content; cross-origin sandboxing for untrusted content is not needed.

### 3.3 Production-fidelity check

A "view as built" action triggers a real build via the `control-app` Worker: runs `tools/generate` against the current site definition, deploys to a preview URL, opens it in a new tab.

This is off the critical edit path. It exists as a sanity check against renderer / build drift, which §3.1 makes structurally near-zero but defense in depth is cheap.

### 3.4 Viewport switching

The preview iframe supports operator-selectable viewport widths. Three presets are sufficient for v1:

| Preset | Width | Use |
|---|---|---|
| `mobile` | 375px | Verify mobile-first rendering (required per [[DOC-7]] §4.2) |
| `tablet` | 768px | Mid-breakpoint check |
| `desktop` | 100% of preview pane | Default view |

---

## 4. Chat → AI → Diff → State → Render Pipeline

### 4.1 The cycle

```
User message in chat
  → builder sends chat history + current site def to AI orchestration
  → AI emits one or more structured tool calls (a diff)
  → each tool call validated against site def + framework catalog
       ├─ invalid: rejected; AI receives machine-readable error; retries within turn
       └─ valid:   applied to site-def state
  → state change → preview iframe re-renders affected modules
  → chat displays AI's narrative reply alongside the visible change
```

### 4.2 State is the single source of truth

The site-definition JSON is the canonical state. Everything else derives:

- Chat history is metadata, not state.
- The preview is a pure function of `(siteDefinition, frameworkCatalog)`.
- Save / publish actions persist state; they never compute it.
- Undo / redo operate on state diffs.

### 4.3 Edits are diffs, not full replacements

AI tool calls produce **diffs** against the site definition (add module, set dial, set token, reorder, attach asset) — never the whole definition.

Rationale:

- Token cost: tiny diff payloads vs. the entire site.
- Diff history naturally feeds undo / redo and (later) audit logging.
- Conflict detection becomes possible if multiple actors edit a site simultaneously (future).

### 4.4 Streaming and progressive update

The AI may emit multiple tool calls within one turn. The builder applies them in order, re-validates after each, and re-renders. The operator sees the site progressively build during a single chat turn — directly realising [[DOC-4]]'s "the platform should progressively build the site while the user watches."

---

## 5. AI Tool Surface

### 5.1 The tool surface mirrors [[DOC-7]] §6.2

The AI's available tools correspond 1:1 to [[DOC-7]]'s "what AI is allowed to edit" list. Each becomes a structured tool definition:

| [[DOC-7]] §6.2 capability | Tool call (illustrative — exact shape per REQ) |
|---|---|
| Site config values | `set_site_config(field, value)` |
| Add / remove / reorder pages | `add_page` / `remove_page` / `reorder_pages` |
| Add / remove / reorder modules | `add_module` / `remove_module` / `reorder_modules` |
| Module variant selection | `set_module_variant(instance_id, variant)` |
| Module dial values | `set_module_dial(instance_id, dial, value)` |
| Module content | `set_module_content(instance_id, field, value)` |
| Site-wide theme tokens | `set_theme_token(name, value)` |
| Navigation pattern, entries, labels | `set_nav_pattern` / `set_nav_entries` |
| Asset references | `attach_asset(instance_id, field, asset_ref)` |

Exact tool definitions evolve per REQ. The principle is: every tool corresponds to an allowed-edits entry in [[DOC-7]] §6.2; no tool exposes capabilities outside that list.

### 5.2 The forbidden list is enforced by absence

[[DOC-7]] §6.3's forbidden actions translate directly to **the absence of corresponding tools**. The AI cannot:

- Write framework or module source — no tool exists.
- Set arbitrary CSS or HTML — no tool exists.
- Introduce module types, variants, or dial values outside the catalog — no tool will accept them.
- Bypass content schemas — content tools validate against `moduleMeta.contentSchema`.

The validator (§6 below) ensures that even if the AI hallucinates a tool call shape or argument, the call cannot land.

### 5.3 Tool failure → AI self-correction within the turn

Validation failures return machine-readable errors, e.g.:

```json
{
  "tool": "set_module_dial",
  "path": "modules[2].dials.shape",
  "expected": ["square", "rounded", "circle"],
  "got": "cirle"
}
```

The AI receives these errors and emits corrected tool calls within the same turn. Tool definitions and schema descriptions are tight enough — finite enums spelled literally in descriptions — that first-call validity rates stay high and retry rates stay in single digits.

---

## 6. Validation Contract

The builder enforces the four-layer mechanical validation gate defined in [[DOC-7]]:

| Layer | Where | What | On failure |
|---|---|---|---|
| 1. AI tool call | Builder UI | Each tool call validated against site def + framework catalog before applying | Reject; return structured error to AI; AI retries |
| 2. Builder state | Builder UI | State store refuses to ingest invalid definitions | Toast; revert |
| 3. Save to D1 | `control-app` Worker | Server-side re-validation before persisting | 4xx; client surfaces error |
| 4. Publish / build | `tools/generate` | Pre-render validation | Block publish; operator notified |

The builder is responsible for layers 1 and 2. Layers 3 and 4 belong to the Worker and the generator. All four layers consume the **same** validator function exported by `packages/site-schema`:

```
validate(siteDefinition, frameworkCatalog) → Result
```

One validator, one set of rules, every layer. Drift between layers is the only way invalid data could ship — collapsing that drift is why the validator is shared, not duplicated.

---

## 7. State Persistence

### 7.1 Where state lives

- **Working state**: in-memory in the builder UI (Zustand store or equivalent per [[DOC-7]] §9.2). Survives panel navigation within a session.
- **Saved state**: D1 row per site. Persisted on operator action and / or autosave (cadence defined per REQ).
- **Revision history**: snapshots persisted by the save endpoint into D1 or R2 per [[DOC-5]]'s revision model. The builder hands a validated definition to the save endpoint; the endpoint owns snapshot mechanics.

### 7.2 Undo / redo

Per-session undo / redo operates on the in-memory diff log. Cross-session undo (e.g. after browser refresh) requires loading a prior snapshot from the save endpoint; not implemented in v1.

---

## 8. Mobile

### 8.1 The builder UI is desktop-first

The chat + live-preview surface is not usable on a phone — the two panels need real estate the small screen cannot provide. v1 is desktop-first.

A future mobile-aware builder might collapse to "chat with swipe-to-preview" or "chat-only with periodic snapshots." This is v2+ work, not a v1 commitment.

### 8.2 Built sites are mobile-first

Per [[DOC-7]] §4.2, every site rendered by the preview iframe — and every site produced by the build — is mobile-first responsive. The preview's viewport-switching feature (§3.4) is what lets the operator verify mobile rendering from a desktop browser.

The distinction is important: **the builder is desktop, the things built by it are mobile-first**.

---

## 9. Out of Scope (v1)

| Item | Status |
|---|---|
| Mobile chat builder | v2+ |
| Multi-user concurrent collaboration on one site | v2+ |
| Cross-session undo / redo | v2+ |
| Click-to-edit inline in the preview | Permanently out of scope; AI-mediated only |
| Drag-to-reorder modules in the preview | Out of scope v1; AI tool call only |
| Direct token / dial / variant pickers (no AI) | Out of scope v1; AI-mediated only |
| Diff visualization (what changed this turn) | Likely v1.5 |
| Voice input | Out of scope |
| **Raw JSON editing mode** | **Permanently out of scope** — undermines the structured-edit guarantee end-to-end |

The last item is the load-bearing one. A "drop to raw JSON" escape hatch in the builder would invalidate every guarantee about structured edits, validation, AI tool-surface enforcement, and catalog evolution. Every change goes through the AI tool surface; no exceptions.

---

## 10. Open Questions Carried Forward

These are not blocking v1 but will surface in subsequent REQs:

1. **Diff visualization** — sidebar of "what changed this turn", preview highlight, both, or neither. Likely v1.5.
2. **Autosave cadence vs. explicit save** — write frequency, debouncing, conflict resolution if the operator opens the same site in two tabs.
3. **Streaming AI responses** — show the AI's narrative as it arrives, or wait for tool calls to complete and re-render once?
4. **Asset upload flow** — drag-into-chat, dedicated asset panel, AI-prompted upload step? Affects when in the chat flow uploads happen.
5. **Mobile preview gesture model** — preset buttons only, or pinch-zoom emulation as well?
6. **Tool-call batching** — when the AI emits many tool calls in one turn, do we re-render after each (true progressive) or coalesce within an animation frame?
7. **AI intent layer** — direct JSON edits vs. a higher-level intent interpreter that translates "make the hero darker" into the right token / dial calls. v1 is direct tools; intent layer is open.

---

## 11. Related Tickets

- [[DOC-4]] — product vision
- [[DOC-5]] — platform architecture
- [[DOC-7]] — website framework architecture principles
- First builder REQ (forthcoming) — Phase 0 chat builder for `sites/1stcontact`: two-panel layout, iframe preview, first AI tool subset, validator wiring, save-to-D1.
