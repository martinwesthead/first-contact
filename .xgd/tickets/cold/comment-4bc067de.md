---
uid: comment-4bc067de
id: COMMENT-7
type: comment
title: Comment on doc DOC-7
created_by: xgd
created_at: '2026-06-12T23:36:42.561322+00:00'
updated_at: '2026-06-12T23:36:42.650824+00:00'
completed_at: null
last_field_updated: body
status: null
fields:
  subject_uid: doc-ab7508c1
  kind: chat_transcript
---

<!-- xgd-cli-session ts="2026-06-12T23:36:39Z" model="claude-opus-4-7" continued_from="new" -->
*Captured by CLI Claude — paraphrased reconstruction from session memory, not raw capture.*

<!-- xgd-chat role="user" ts="2026-06-12T22:57:52.100Z" -->
#### You
I was thinking that there should be some mechanical validation of the JSON edits before publication

<!-- xgd-chat role="assistant" ts="2026-06-12T22:57:52.100Z" -->
#### Claude
Strongly agree — and load-bearing enough to change the doc shape.

**Why mechanical validation is the linchpin:** the whole architecture pivots on "AI emits structured edits." That bet only pays off if **invalid edits are mechanically impossible to ship**. Without a hard validation gate: a bad dial value escapes to D1 and crashes render; an `asset-ref` to a deleted image silently breaks layout; AI mishearing a dial enum corrupts state; framework upgrades quietly invalidate older stored definitions; a clever content field smuggles HTML/CSS past §6.3's forbidden list. Validation is what makes "structured changes only" a real guarantee instead of an aspiration.

**What mechanical validation can check** (deterministic, sub-100ms, no I/O):
1. **Schema conformance** — site definition matches `packages/site-schema`. Required fields, types, no unknown keys.
2. **Module-meta conformance** — for each module instance: `type` exists at `version`; `variant` ∈ `moduleMeta.variants`; every dial value ∈ `moduleMeta.dials[name]`; content matches `moduleMeta.contentSchema`.
3. **Theme-token conformance** — every set token is in the framework's contract; values pass type checks for their token kind.
4. **Referential integrity** — every `asset-ref` resolves; every nav entry's target exists; module IDs referenced from nav exist.
5. **Uniqueness / structure** — module IDs unique within page; page slugs unique within site; nav non-circular.
6. **Content-field safety** — content fields don't contain inline `<style>`/`<script>` or raw HTML beyond what the field's content type allows; URLs well-formed.

**Where the gate sits — four layers, same validator:**
- AI tool call → validate against state + framework catalog before applying; reject with machine-readable error; AI self-corrects on retry
- Builder state → refuses to ingest invalid definitions
- Save to D1 → control-app Worker re-validates server-side; defense in depth
- Build / publish → `tools/generate` validates before render; catches framework-upgrade drift

One function: `validate(siteDefinition, frameworkCatalog) → Result`. Lives in `packages/site-schema`. Consumed by all four layers — same code, same rules. Drift between layers is the only way invalid data ships; collapsing that drift is why the validator is shared, not duplicated.

**Cost worth naming:** AI-tool-call gate has retry cost. Mitigations: schema in system prompt; errors machine-readable (`{ path: 'modules[2].dials.shape', expected: [...], got: 'cirle' }`) so AI fixes precisely; tight schema descriptions for finite enums. Empirically: retry rates in low single digits.

**Implication for DOC-7:** validation is both a framework guarantee (DOC-7) and a builder principle (DOC-8). DOC-7 should get a new section: "Mechanical validation is a framework guarantee. The framework provides a single validator. No code path may write to D1 or render without it." — making the validator a first-class framework commitment so every consumer (builder, generator, future API clients) depends on the same validator existing.

<!-- xgd-chat role="user" ts="2026-06-12T23:05:21.313Z" -->
#### You
let do doc 7 next

<!-- xgd-chat role="assistant" ts="2026-06-12T23:05:21.313Z" -->
#### Claude
DOC-7 updated. Section structure clean — no renumbering of existing sections, so DOC-8's cross-references to §6.2 / §6.3 stay valid. New content:

- **§2.4 Renderer is invocable in two execution contexts** — locks in browser-importable ESM, no Node-only deps on the rendering path, asset resolution context-agnostic. This is the framework-side commitment that makes DOC-8 §3.1 (in-browser preview) architecturally safe.
- **§6.5 Mechanical validation contract** — single validator owned by `packages/site-schema`, deterministic / synchronous / sub-frame, six categories of checks, machine-readable errors, consumed identically by all four layers. "No code path may write a site definition to D1, render it for production, or apply it to builder state without passing the validator" — the structured-edit guarantee made enforceable.
- §10 dependency direction additions: `packages/framework` as in-browser dep of builder; `packages/site-schema` as canonical home of the validator.
- §11.1 note that the in-browser execution context shares the same module code, no `tools/generate` in the preview path.
- §14 links DOC-8 and adds placeholder for validator REQ.

Durable arch frame now complete: DOC-4 / DOC-5 / DOC-7 / DOC-8 cover product, platform, framework, builder. Next: scope the validator REQ (foundational; everything else consumes it), then framework v1 REQ (Phase 0 module set, theme tokens, `tools/generate`, `sites/1stcontact`), then builder v1 REQ.

<!-- xgd-chat-end -->