---
uid: request-b76f8816
id: REQ-27
type: request
title: 'Design Brief: per-site canonical memory markdown, propose-and-apply AI updates,
  builder Brief tab'
created_by: xgd
created_at: '2026-06-16T23:27:34.749937+00:00'
updated_at: '2026-06-16T23:27:34.749937+00:00'
completed_at: null
last_field_updated: created_at
status: draft
fields:
  priority: high
  story_points: 7
  auto_merge_back: true
  needs_review: false
---

## Problem

Per [[DOC-9]] §4 every site needs a canonical **Design Brief** — a sectioned markdown document holding the crystallized decisions (palette, typography, layout, navigation, voice, content priorities) plus reference summaries. This is the AI's load-bearing memory across chat sessions for that site: new chat starts → AI reads the Brief → up to speed.

Today the AI's only memory of prior decisions is whatever the operator restates. There is no per-site canonical artifact. The Brief is the gradient between transcript (everything that happened) and operating state (what was decided), and is the thing that makes multi-session continuity feel like working with a designer rather than starting over.

This REQ delivers the Brief as a first-class site artifact: schema, persistence, AI-mediated update flow, and the right-panel rendering.

## Scope

Land the Design Brief as a first-class artifact per site. After this REQ:

- Every site row in D1 has an associated `design_brief.md` stored alongside its site definition.
- The Brief is rendered with TipTap WYSIWYG (same toolchain as [[REQ-16]]'s assets tab) and editable directly by the operator.
- The AI proposes Brief edits via a new `propose_brief_update` tool; edits land as **diff suggestions** in the chat that the operator one-click accepts or rejects. No auto-write.
- Every new chat session loads the Brief into the AI's system context.
- The Brief follows the KMS-aware sectioned shape from [[DOC-9]] §9 so future KMS retrofit is free.

## Decisions already made (open questions closed)

These resolve [[DOC-9]] §13 item 8 (Brief size before KMS) and several Brief-specific shape questions inline:

- **Update discipline** ([[DOC-9]] §4.2): AI-proposed edits land as a diff in the chat panel; the operator clicks "Apply" or "Reject" (per-section granularity, not per-character). Auto-write without confirmation is explicitly out — pollution risk is real. Direct operator edits via the TipTap editor go straight through; no AI approval gate on the operator's own edits.
- **Brief storage location**: the Brief markdown is a row field on the site (`sites.design_brief` column added by [[REQ-10]] migration — a one-line additive migration owned by this REQ). It is **not** an R2 asset, because it is the AI's primary system-context input and needs to be SQL-queryable, not opaque.
- **Brief size budget pre-KMS**: target ≤ 16KB. When the Brief exceeds 32KB, the AI is auto-prompted to run a consolidation pass (rewrite sections more tightly, archive resolved open questions into a `## History` collapsed section). At 64KB the consolidation prompt becomes blocking — the AI must consolidate before any further `propose_brief_update` is accepted. These numbers are interim until the planned KMS lands per [[DOC-9]] §9 closing paragraph.
- **Section taxonomy (v1)**: the seven canonical sections per [[DOC-9]] §4.1 are: `Project context`, `References`, `Palette`, `Typography`, `Layout`, `Navigation`, `Voice & tone`, `Content priorities`, `Open questions`. Initial Brief on site creation contains all of these as `> TBD` placeholders. Operator and AI can add custom sections but the seven canonicals always exist (the canonical list is enforced by validator).
- **AI context loading**: every chat-session opening for a site loads the full Brief markdown into the system prompt. Pre-KMS, no summarization is applied below the 16KB threshold; above 16KB, the AI dispatcher prepends a 1-line note "Brief exceeds 16KB; consider proposing a consolidation."
- **Render surface**: the Brief appears in a new builder tab `Brief` (per [[REQ-16]]'s tab-shell pattern: `Builder | Brief | Settings | Assets | Revisions | Leads`). The tab content is the TipTap-rendered Brief with the section taxonomy as headed sections; chat panel shows on the left as elsewhere.
- **Diff UI**: AI proposals render in chat as a `BriefProposal` structured tool_result containing `{section, before, after, rationale}`. The proposal block has Apply / Reject buttons. Apply writes the section, dirties the editor if the Brief tab is open, and emits a chat note "Brief updated: section X". Reject discards.
- **Cross-chat references** ([[DOC-9]] §5 default chat search scope): when the AI proposes a Brief edit that references a digest from the current chat (e.g. "Add reference: this plumber's emergency-callout positioning"), the reference is recorded as a markdown link `[Plumber X](chat://CHAT-id/turn-id)` so the rendered Brief can deep-link back. Out-of-chat references not supported in v1.

## Design conversation

Full thread: [[CHAT-13]]. Key operator framing for this REQ:

> "Actually what I am thinking is that each site should have a single markdown document capturing requirements. Reference material screenshots and reports that were generated during the process of discussing the site could be permanently stored there along with a chat summary of decisions made about color palettes layout navigation voice etc. We could store this markdown documents in the assets... We could call it the Design Brief"
> — [[CHAT-13]] turn 6

> "I am working on a knowledge management system that could generate mechanical summaries of documents and might be associated with a read tool that could read a section. So the summary would contain whatever the first 200-400 characters of the document plus a 'table of contents' — the AI can then access the bits of the document(s) that it needs when it needs them. This doesn't exist yet but it will be available for our system before it goes live."
> — [[CHAT-13]] turn 7

> "Please note I do want to maintain our chat sessions. And I want the transcripts to be available to the AIs. The simplest approach here is that the session just grows in an unbounded way and we typically only load and reference parts of it."
> — [[CHAT-13]] turn 7

The KMS is upcoming infrastructure; the Brief's sectioned shape ([[DOC-9]] §9) is the bet that the KMS can wrap our documents without retrofit. Chat persistence is a separate REQ (not this one) — this REQ assumes chat IDs and turn IDs are stable references.

## IN

### D1 schema migration (`apps/control-app/migrations/`)

```sql
ALTER TABLE sites ADD COLUMN design_brief TEXT NOT NULL DEFAULT '';
ALTER TABLE sites ADD COLUMN design_brief_updated_at TEXT NOT NULL DEFAULT '';
```

Backfill: on first read of a site whose `design_brief` is empty, the API generates the canonical seven-section skeleton with `> TBD` placeholders and saves it. No batch migration; lazy.

### Brief schema + validator (`packages/site-schema`)

`BriefDocument` type + a validator enforcing:

- All seven canonical sections present (by `##` heading match).
- Document shape conforms to KMS-aware template ([[DOC-9]] §9): H1 title → blockquote summary → `## Table of contents` → numbered/sectioned body.
- Total size in bytes (informational; not validation-enforced; surfaced for the size-budget logic).

Exported `parseBrief(md): BriefDocument` and `renderBrief(doc): md` round-trip.

### `apps/control-app` Worker routes

- `GET /api/sites/{slug}/brief` → returns `{ markdown, updatedAt, sizeBytes }`. Brief is the markdown source of truth.
- `PUT /api/sites/{slug}/brief` → accepts `{ markdown }`; runs `parseBrief`, validates, writes to D1, returns `{ updatedAt, sizeBytes }`.
- `POST /api/sites/{slug}/brief/section` → accepts `{ section: string, markdown: string }`; replaces just that section's body (the AI's Apply path uses this).

### AI tool

`propose_brief_update` added to the AI tool surface:

```
input: {
  section: 'Project context' | 'References' | 'Palette' | 'Typography' | 'Layout' |
           'Navigation' | 'Voice & tone' | 'Content priorities' | 'Open questions' | string,
  newContent: string,    // markdown, replaces the section body
  rationale: string,     // shown in the diff UI
}
output: { ok: true, proposalId: string } | { ok: false, error: typed-error }
```

The tool does **not** write the Brief. It emits a structured `BriefProposal` `tool_result` that the chat UI renders as a diff card with Apply / Reject actions. Apply hits `POST /api/sites/{slug}/brief/section`.

### Chat dispatcher context loading

On chat-session open for a site, the dispatcher prepends the Brief markdown to the AI's system context as a labelled block:

```
<design-brief site="{slug}" updated="{updatedAt}">
{briefMarkdown}
</design-brief>
```

Above 16KB the dispatcher appends a single-line note (see Decisions). Above 32KB the AI receives a synthesized first turn from the system: "The Brief has grown beyond the recommended size. Consider proposing a consolidation."

### Builder UI — new `Brief` tab

- New `createBriefTab(parent, options)` factory mirroring [[REQ-16]]'s asset-tab structure.
- Left: section list (sticky), clicking a section scrolls the editor to it.
- Right (or main content): TipTap editor mounting the full Brief markdown with sections rendered as `##` headings (toolbar identical to [[REQ-16]]'s assets editor).
- Dirty tracking + Save semantics: identical pattern to [[REQ-16]].
- Save serializes through the same `htmlToMarkdown` path.

### Chat panel — `BriefProposal` rendering

The chat panel from [[REQ-13]] gains a renderer for the `BriefProposal` `tool_result` type: shows section name, side-by-side diff (or unified diff if narrow), rationale text, Apply / Reject buttons. Apply call: `POST /api/sites/{slug}/brief/section`. Reject: dismisses the card and emits a chat note.

## OUT (explicitly deferred)

- Cross-site Brief references ("I want this site's voice like that other site I worked on") — chat scope is per-site per [[DOC-9]] §5.
- A separate "References library" UI surface — references live as a section inside the Brief, not as a discrete library.
- Multi-author concurrent editing on the Brief — single-operator semantics. Last write wins.
- Versioning of the Brief — D1 stores current state; reverting is operator-driven via undo in the editor session. Site-level revisions ([[REQ-11]]) cover snapshotted Brief content as part of the site row.
- KMS-driven summarization and section-read — placeholder hooks exist (the 16KB / 32KB / 64KB thresholds) but no actual summarization in v1.
- Brief export / import beyond what the markdown endpoint already supports.

## Dependencies

- [[REQ-10]] — D1 schema (the migration extends `sites`).
- [[REQ-13]] — structured `tool_result` model + chat markdown rendering.
- [[REQ-16]] — TipTap editor toolchain + tab-shell pattern.
- [[REQ-21]] — Reference Digest (Brief `References` section embeds links to digests).
- [[DOC-9]] §4, §5, §9 — Design Brief definition, two-tier memory, KMS-aware shape.

## Acceptance criteria

1. A newly created site has a `design_brief` row with the seven canonical `##` sections each containing `> TBD`.
2. `GET /api/sites/{slug}/brief` returns the markdown, `updatedAt`, and `sizeBytes`.
3. `PUT /api/sites/{slug}/brief` with markdown missing the `## Palette` section returns `400 invalid_brief` with `reason: "missing_canonical_section"` and `section: "Palette"`.
4. `propose_brief_update` with `{ section: "Voice & tone", newContent: "Warm and direct...", rationale: "..." }` emits a `BriefProposal` `tool_result` containing the diff and rationale. The Brief on disk is unchanged until Apply.
5. Clicking Apply on a `BriefProposal` hits `POST /api/sites/{slug}/brief/section`; subsequent `GET /api/sites/{slug}/brief` reflects the new section content; `updatedAt` advances.
6. The chat dispatcher includes the Brief in the AI's system context within a `<design-brief>` block on session open. Verified by inspecting the dispatched messages array.
7. Brief above 16KB adds a one-line consolidation hint to the AI context. Brief above 32KB triggers a synthesized first turn from the system asking the AI to propose consolidation.
8. Brief tab in the builder: opens, renders the seven sections as TipTap-editable HTML, allows direct operator edits, dirty-tracks correctly, saves via the markdown round-trip.
9. A `propose_brief_update` referencing a digest from the current chat embeds a markdown link of the shape `[label](chat://{chatId}/{turnId})`; the rendered Brief in the tab displays this as a clickable link that focuses the source chat turn.
10. The Brief Apply flow gracefully handles concurrent edits: if the operator has the Brief tab open with unsaved changes when an Apply lands, the editor surfaces a "Refresh — Brief was updated by the AI" prompt; no silent overwrite.
11. UAT: operator and AI complete an inspiration discussion (via REQ F) and the AI proposes three Brief updates (`References`, `Palette`, `Voice & tone`). Each is applied with one click. Operator reloads the chat next day, the AI's first turn references the Brief contents accurately (e.g. "based on the warm palette you committed to yesterday…").
