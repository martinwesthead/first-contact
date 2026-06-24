---
uid: request-b76f8816
id: REQ-27
type: request
title: 'Design Brief: per-site canonical memory markdown, propose-and-apply AI updates,
  builder Brief tab'
created_by: xgd
created_at: '2026-06-16T23:27:34.749937+00:00'
updated_at: '2026-06-18T22:27:28.574376+00:00'
completed_at: null
last_field_updated: body
status: draft
fields:
  priority: high
  story_points: 7
  auto_merge_back: true
  needs_review: false
---

## Problem

Per [[DOC-9]] §4 every site needs a canonical **Design Brief** — a sectioned markdown document holding the crystallized decisions (palette, typography, layout, navigation, voice, content priorities) plus reference summaries. This is the AI's load-bearing memory of *the site's identity* across chat sessions: new chat starts → AI reads the Brief on demand → grounded in prior decisions without forcing the operator to restate them.

Today there is no per-site canonical artifact. The Brief is the gradient between transcript (everything that happened) and operating state (what was decided), and is what makes multi-session continuity feel like working with a designer rather than starting over.

This REQ delivers the Brief as a first-class site artifact: schema, persistence, AI-mediated update flow, AI read-access via the [[DOC-10]] tool pattern, and the operator-facing render surface.

## Scope

Land the Design Brief as a first-class artifact per site. After this REQ:

- Every site row in D1 has an associated `design_brief` markdown string stored alongside its site definition.
- The Brief is rendered with TipTap WYSIWYG (same toolchain as [[REQ-16]]'s assets tab) and operator-editable directly.
- The AI proposes Brief edits via a new `propose_brief_update` tool; edits land as **diff suggestions** in the chat that the operator one-click accepts or rejects. No auto-write.
- The AI accesses the Brief via a `read_brief({section?})` tool, mirroring [[DOC-10]] §5.2's `read_reference_doc` pattern. The Brief is **not** inlined into the system prompt; only its summary + table of contents is.
- The Brief follows the KMS-aware sectioned shape from [[DOC-9]] §9 so the read-by-section pattern is structural, not retrofitted.

## Decisions already made (open questions closed)

These resolve [[DOC-9]] §13 item 8 (Brief size pre-KMS) and several Brief-specific shape questions inline. Where this REQ's earlier draft disagreed with [[DOC-10]] §3 (the Brief as a "third memory surface" accessed by name), [[DOC-10]] wins.

- **Access pattern** ([[DOC-10]] §3, §5.2): the Brief is the **third memory surface** alongside chat sessions and reference docs. It is loaded by name when the AI needs the site's identity, not inlined into every system prompt. The Brief's summary (first 200–400 chars) plus its table of contents is the only thing inlined per turn; the body is read on demand via `read_brief({section?})`.
- **Update discipline** ([[DOC-9]] §4.2): AI-proposed edits land as a diff in the chat panel; the operator clicks "Apply" or "Reject" (per-section granularity). Auto-write is explicitly out — pollution risk is real. Direct operator edits via the TipTap editor go straight through; no AI approval gate on the operator's own edits.
- **Brief storage location**: the Brief markdown is a row field on the site (`sites.design_brief` column added by this REQ's migration). It is **not** an R2 asset, because it is queried by the chat dispatcher (for summary + ToC extraction) on every turn — fast D1 access wins over R2 latency.
- **Brief size budget pre-KMS**: target ≤ 16KB. When the Brief exceeds 32KB, the AI dispatcher prepends a one-line consolidation hint to the system prompt: "Brief is over the consolidation threshold; consider proposing a tightening pass." At 64KB the hint becomes a synthesized first-turn system message that the AI must address before any further `propose_brief_update` is accepted by the validator.
- **Section taxonomy (v1)**: the nine canonical sections per [[DOC-9]] §4.1 are: `Project context`, `References`, `Palette`, `Typography`, `Layout`, `Navigation`, `Voice & tone`, `Content priorities`, `Open questions`. Initial Brief on site creation contains all of these as `> TBD` placeholders. Operator and AI can add custom sections but the nine canonicals always exist (enforced by the validator).
- **Render surface**: the Brief appears in a new builder tab `Brief` (per [[REQ-16]]'s tab-shell pattern: `Builder | Brief | Settings | Assets | Revisions | Leads`). The tab content is the TipTap-rendered Brief with the section taxonomy as headed sections; chat panel shows on the left as elsewhere.
- **Diff UI**: AI proposals render in chat as a `BriefProposal` structured tool_result containing `{section, before, after, rationale}`. The proposal block has Apply / Reject buttons. Apply writes the section via `POST /api/sites/{slug}/brief/section` and emits a chat note "Brief updated: section X". Reject discards.
- **Cross-chat references** ([[DOC-9]] §5 default chat search scope): when the AI proposes a Brief edit that references a digest from the current chat (e.g. "Add reference: this plumber's emergency-callout positioning"), the reference is recorded as a markdown link `[Plumber X](chat://CHAT-id/turn-id)` so the rendered Brief can deep-link back. Out-of-chat references not supported in v1.
- **`read_brief` semantics**: with no `section` argument, returns `{title, summary, toc}` — small, designed to fit when the AI just needs a "what is this site about" prime. With `section: "Palette"` returns the matched section's full body. Section matching is case-insensitive, normalized for whitespace.

## Design conversation

Full thread: [[CHAT-13]]. Key operator framing for this REQ:

> "Actually what I am thinking is that each site should have a single markdown document capturing requirements. Reference material screenshots and reports that were generated during the process of discussing the site could be permanently stored there along with a chat summary of decisions made about color palettes layout navigation voice etc. We could store this markdown documents in the assets... We could call it the Design Brief"
> — [[CHAT-13]] turn 6

> "I am working on a knowledge management system that could generate mechanical summaries of documents and might be associated with a read tool that could read a section. So the summary would contain whatever the first 200-400 characters of the document plus a 'table of contents' — the AI can then access the bits of the document(s) that it needs when it needs them."
> — [[CHAT-13]] turn 7

The KMS pattern landed earlier than the original [[CHAT-13]] turn 7 expected ("won't exist until before launch"). [[DOC-10]] §5.2 commits the AI-memory-tool pattern as the canonical access shape for reference docs *now*. The Brief follows the same pattern from day one — no transitional "stuff the whole thing into context" phase.

## IN

### D1 schema migration (`apps/control-app/migrations/`)

```sql
ALTER TABLE sites ADD COLUMN design_brief TEXT NOT NULL DEFAULT '';
ALTER TABLE sites ADD COLUMN design_brief_updated_at TEXT NOT NULL DEFAULT '';
```

Backfill: on first read of a site whose `design_brief` is empty, the API generates the canonical nine-section skeleton with `> TBD` placeholders and saves it. No batch migration; lazy.

### Brief schema + validator (`packages/site-schema`)

`BriefDocument` type + a validator enforcing:

- All nine canonical sections present (by `##` heading match).
- Document shape conforms to [[DOC-9]] §9 / [[DOC-10]] §6.2 KMS-aware template: H1 title → blockquote `> Summary:` → `## Table of contents` → numbered/sectioned body.
- Section matcher exported as `getBriefSection(md, sectionName) → string | null`; used by `read_brief` and by `POST /brief/section`.

Exported `parseBrief(md): BriefDocument`, `renderBrief(doc): md`, `extractBriefSummaryAndToc(md): {title, summary, toc}` for the dispatcher's prime path.

### `apps/control-app` Worker routes

- `GET /api/sites/{slug}/brief` → `{ markdown, updatedAt, sizeBytes }`.
- `PUT /api/sites/{slug}/brief` → accepts `{ markdown }`; runs `parseBrief`, validates, writes to D1.
- `POST /api/sites/{slug}/brief/section` → accepts `{ section: string, markdown: string }`; replaces just that section's body (the AI's Apply path and the `read_brief` symmetry both rely on this).

### AI tools

`propose_brief_update` (the mutator):

```
input: {
  section: string,    // must match one of the nine canonical names, or any operator-added section
  newContent: string, // markdown, replaces the section body
  rationale: string,  // shown in the diff UI
}
output: { ok: true, proposalId: string } | { ok: false, error: typed-error }
```

The tool does not write the Brief. It emits a structured `BriefProposal` `tool_result`.

`read_brief` (the reader — mirrors [[DOC-10]] §5.2's `read_reference_doc`):

```
input: { section?: string }
output: section
  ? { title, section, body, updatedAt }
  : { title, summary, toc, updatedAt, sizeBytes }
```

`read_brief()` with no argument returns the small summary+ToC payload. With `section`, returns that section's body.

### Chat dispatcher integration

The dispatcher already implements tail-prime + reference-doc index inlining per [[REQ-24]] / [[DOC-10]] §5.1. This REQ extends the system prompt with one additional block:

```
<design-brief site="{slug}" updated="{updatedAt}" sizeBytes="{n}">
> Summary: {first 200–400 chars of Brief summary block}
## Table of contents
- {section} — {first ToC line}
- ...
</design-brief>
```

Above 32KB the dispatcher appends a one-line consolidation hint to the system prompt. Above 64KB the dispatcher injects a synthesized first-turn system message asking the AI to consolidate; `propose_brief_update` calls until then are rejected at the validator layer with `requires_consolidation`.

This is the **only** Brief content in the system prompt. The body is read on demand by `read_brief({section})`.

### Builder UI — new `Brief` tab

- `createBriefTab(parent, options)` factory mirroring [[REQ-16]]'s asset-tab structure.
- Left: section list (sticky); click scrolls to that section in the editor.
- Right (main content): TipTap editor mounting the full Brief markdown with sections rendered as `##` headings (toolbar identical to [[REQ-16]]'s assets editor).
- Dirty tracking + Save semantics: identical pattern to [[REQ-16]].
- Save serializes through `htmlToMarkdown` and `PUT`s `/api/sites/{slug}/brief`.

### Chat panel — `BriefProposal` rendering

The chat panel from [[REQ-13]] gains a renderer for the `BriefProposal` `tool_result` type: section name, side-by-side or unified diff (responsive to width), rationale, Apply / Reject buttons. Apply: `POST /api/sites/{slug}/brief/section`. Reject: dismisses + emits chat note.

## OUT (explicitly deferred)

- Cross-site Brief references — chat scope is per-site per [[DOC-9]] §5.
- Multi-author concurrent editing — single-operator semantics; last write wins.
- Brief-level revisions / undo beyond the editor session — site-level revisions ([[REQ-11]]) snapshot Brief content as part of the site row.
- Auto-summarization at the 16KB threshold — the consolidation pass is AI-driven, not mechanical.
- Brief export / import beyond what the markdown endpoints already support.
- Always-in-context loading of the full Brief body — explicitly rejected per [[DOC-10]] §3. The summary + ToC inline is the only standing-context cost.

## Dependencies

- [[REQ-10]] — D1 schema (the migration extends `sites`).
- [[REQ-13]] — structured `tool_result` model + chat markdown rendering.
- [[REQ-16]] — TipTap editor toolchain + tab-shell pattern.
- [[REQ-21]] — Reference Digest (Brief `References` section embeds links to digests).
- [[REQ-23]] — D1 schema for chat sessions (this REQ's chat-link format depends on stable session/turn IDs).
- [[REQ-24]] — Chat session API + AI memory tools (the dispatcher pattern this REQ extends).
- [[DOC-9]] §4, §5, §9 — Design Brief definition, two-tier memory, KMS-aware shape.
- [[DOC-10]] §3, §5.2 — third memory surface, read-by-name access pattern.

## Acceptance criteria

1. A newly created site has a `design_brief` row populated with the nine canonical `##` sections each containing `> TBD`.
2. `GET /api/sites/{slug}/brief` returns the markdown, `updatedAt`, and `sizeBytes`.
3. `PUT /api/sites/{slug}/brief` with markdown missing the `## Palette` section returns `400 invalid_brief` with `reason: "missing_canonical_section"` and `section: "Palette"`.
4. `propose_brief_update` with `{ section: "Voice & tone", newContent: "Warm and direct...", rationale: "..." }` emits a `BriefProposal` `tool_result` containing the diff and rationale. The Brief on disk is unchanged until Apply.
5. Clicking Apply on a `BriefProposal` hits `POST /api/sites/{slug}/brief/section`; subsequent `GET /api/sites/{slug}/brief` reflects the new section content; `updatedAt` advances.
6. The dispatcher inlines only the `<design-brief>` summary + ToC block in the system prompt — not the full body. Verified by inspecting the dispatched messages array against a Brief ≥ 4KB: the system prompt contains the summary text but does not contain section body text past the summary.
7. `read_brief()` returns `{title, summary, toc, updatedAt, sizeBytes}` matching the Brief's current state.
8. `read_brief({section: "Voice & tone"})` returns the full body of the `## Voice & tone` section.
9. Brief above 32KB: dispatcher adds the consolidation hint to the system prompt. Brief above 64KB: dispatcher injects the synthesized first-turn message; further `propose_brief_update` calls return `requires_consolidation` until the Brief is consolidated below 32KB.
10. Brief tab in the builder: opens, renders the nine sections as TipTap-editable HTML, allows direct operator edits, dirty-tracks correctly, saves via the markdown round-trip.
11. A `propose_brief_update` referencing a digest from the current chat embeds a markdown link of the shape `[label](chat://{chatId}/{turnId})`; the rendered Brief in the tab displays this as a clickable link that focuses the source chat turn.
12. The Brief Apply flow gracefully handles concurrent edits: if the operator has the Brief tab open with unsaved changes when an Apply lands, the editor surfaces a "Refresh — Brief was updated by the AI" prompt; no silent overwrite.
13. UAT: operator and AI complete an inspiration discussion (via [[REQ-29]]) and the AI proposes three Brief updates (`References`, `Palette`, `Voice & tone`). Each is applied with one click. Operator reloads the chat next day, the AI's first turn calls `read_brief()`, gets the summary + ToC, and grounds its first message in the prior decisions accurately.



---

## Demo critical-path status (added 2026-06-18)

**Deferred from the convert-flow demo critical path** per the 2026-06-18 planning chat. The demo (paste URL → reproduce site) does not exercise the Design Brief — [[REQ-28]] originally chained a `propose_brief_update` call after a successful transcription; that hook is dropped for the demo.

When this REQ lands, the post-transcription Brief-update nudge is restored as a small follow-on refactor to [[REQ-28]] (the LLM transcription prompt re-adds the `propose_brief_update` hook). No schema or tool-surface change is required from this REQ to support that restoration.

Implementation ordering: the demo slice (REQ-20 → REQ-13 → REQ-21 → REQ-22 → REQ-28) lands first to validate framework flexibility. This REQ comes after the demo confirms the framework is the right shape and per-site memory is the right next step.
