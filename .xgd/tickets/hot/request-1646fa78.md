---
uid: request-1646fa78
id: REQ-26
type: request
title: Reference docs library + initial seed (distilled product understanding for
  the 1stContact AI)
created_by: xgd
created_at: '2026-06-16T23:27:09.634013+00:00'
updated_at: '2026-06-16T23:27:09.634013+00:00'
completed_at: null
last_field_updated: created_at
status: draft
fields:
  priority: medium
  story_points: 5
  auto_merge_back: true
  needs_review: false
---

# Reference docs library + initial seed (distilled product understanding for the 1stContact AI)

Populate the `reference_docs` table with the initial set of distilled, KMS-aware documents the 1stContact AI consults at runtime, per [[DOC-10]] §6. Establish the source-of-truth layout (filesystem) and the build-time hydration pipeline that pushes them into D1.

Design discussion: [[DOC-10]] §6, §10. Transcript excerpts in Appendix A below.

## Why free-coded

Document-and-pipeline REQ — single cohesive intent. The shape (summary + ToC + sectioned body) is settled in [[DOC-10]]. The content choices (which foundational artifacts to distill) are listed below; execution is editorial + a small build step.

## Dependencies

- Blocking on the schema REQ (`reference_docs` table).
- Concurrent with the API REQ — the API exposes `list_reference_docs` / `read_reference_doc`, this REQ supplies the rows they return.
- This REQ does NOT depend on the UI REQ; reference docs are AI-consumed, not directly operator-displayed in v1.

## Scope

### IN — Filesystem source of truth

- Create `reference-docs/` at repo root. One markdown file per doc; path under `reference-docs/` becomes the slug (e.g., `reference-docs/modules/hero-split.md` → slug `modules/hero-split`).
- Each file follows the canonical shape from [[DOC-10]] §6.2:

  ```markdown
  ---
  kind: architecture | module | design-decision | framework | onboarding
  ---
  # {title}

  > Summary: 1–2 paragraph distillation, AI-read first.

  ## Table of contents
  - {section-slug} — one-line description
  - …

  ## {section-slug}
  …body…
  ```

- Frontmatter is YAML, currently carrying only `kind`. Title is the H1. Summary is the first blockquote. ToC is the first H2 named "Table of contents". Sections are subsequent H2s.

### IN — Initial seed content (distilled, not copy-pasted)

Distill the existing foundational artifacts into AI-actionable form:

- `architecture/product-vision.md` ← [[DOC-4]]
- `architecture/platform-architecture.md` ← [[DOC-5]]
- `architecture/framework-principles.md` ← [[DOC-7]]
- `architecture/builder-ui-principles.md` ← [[DOC-8]]
- `architecture/web-fetching.md` ← [[DOC-9]] §2–§7 (use cases + Reference Digest model)
- `architecture/design-brief.md` ← [[DOC-9]] §8–§9 (Design Brief shape + lifecycle)
- `architecture/chat-and-memory.md` ← [[DOC-10]] (this REQ's own design doc — so the AI knows how its own memory works)
- `modules/<module-id>.md` ← one per module from the framework catalog (`packages/framework/`). Each captures: purpose, variants, dials and their meanings, content fields, usage guidance, common pitfalls.
- `design-decisions/per-site-chat-scoping.md` ← summarizes the per-site decision and why
- `design-decisions/append-only-tail-prime.md` ← summarizes the persistence model and why
- `design-decisions/two-tier-memory.md` ← chat (working) vs Design Brief (crystallized) vs reference docs (platform), and when to write to each

For each: keep distillation tight. The AI reads the summary on every turn (cheap) and reads the body only when the conversation calls for it. Verbose source DOCs are NOT a model to copy — extract the AI-actionable kernel.

### IN — Build-time hydration

- Script under `scripts/` (or `db/seed/`) that:
  1. Walks `reference-docs/**/*.md`.
  2. Parses frontmatter (yaml), title (H1), summary (first blockquote), ToC (first H2 "Table of contents" — bullets become `{section_slug, description}`), body (whole file).
  3. Upserts each into `reference_docs` keyed on slug.
  4. Reports added / updated / removed rows.
- Wire into the existing migration / deploy pipeline. Local dev: `npm run reference-docs:hydrate` (or whatever convention is current).
- Production: hydration runs on deploy. The D1 reference_docs table is treated as derived from `reference-docs/` — never edited live; always rebuilt from source.
- A file deleted from `reference-docs/` deletes its row from `reference_docs` on next hydration (reconciled by slug).

### OUT

- Operator-facing UI for browsing or editing reference docs (deferred until a real need surfaces).
- Per-site reference docs (every site shares the same set in v1; per-site docs would be a separate table).
- KMS-style automated summary generation — humans write summaries in v1; KMS retrofit can later automate this without schema change.
- Embedding / vector index over reference docs — FTS5 suffices.

## Acceptance criteria

1. `reference-docs/` exists at repo root with the seed set listed under §Scope IN.
2. Each seed doc parses cleanly: title, summary, ToC with at least one section, kind in frontmatter.
3. Running the hydration script populates `reference_docs` with one row per file; slugs match the path-derived convention.
4. Re-running hydration is idempotent (no row churn when no file changed).
5. Deleting a source file and re-running hydration removes the corresponding row.
6. `list_reference_docs` (from the API REQ) returns the seeded entries.
7. `read_reference_doc(slug)` returns the full body; `read_reference_doc(slug, section=…)` returns only that section's body.
8. AI-consumed module docs (`modules/<id>.md`) cover EVERY module currently in the framework catalog.
9. Summary length: each doc's summary is ≤ 400 characters (KMS budget per [[CHAT-13]]).
10. The hydration script reports its work clearly (added / updated / removed counts).

## Test plan (UAT-primary)

Tests under `tests/`, named `test_UAT_FC_<TICKET-ID>_*.ts`. Stack: vitest + Miniflare D1.

- `test_UAT_FC_<TICKET-ID>_parser.ts` — feed the parser fixture markdown with title + summary + ToC + sections; verify the parsed object matches expectations.
- `test_UAT_FC_<TICKET-ID>_hydrate_idempotent.ts` — hydrate twice over the same source; second run produces no row mutations.
- `test_UAT_FC_<TICKET-ID>_hydrate_remove.ts` — delete a fixture file, re-hydrate, row gone.
- `test_UAT_FC_<TICKET-ID>_section_filter.ts` — `read_reference_doc(slug, section=…)` returns only the target section's body.
- `test_UAT_FC_<TICKET-ID>_summary_budget.ts` — every seeded doc has summary ≤ 400 chars (regression guard).
- `test_UAT_FC_<TICKET-ID>_module_coverage.ts` — for each module in the framework catalog, a reference doc exists at `modules/<id>.md`.

## Notes for implementer

- The 400-char summary budget mirrors the KMS spec from [[CHAT-13]]: "the summary would contain whatever the first 200-400 characters of the document plus a table of contents." Keep summaries under that.
- The ToC parser must tolerate `- {slug} — {description}` AND `- [{slug}](#anchor) — {description}` AND a plain `- {slug}: {description}`. Pick one canonical form and document it; the parser is forgiving.
- Frontmatter parsing: keep it minimal — only `kind` today. Resist adding fields without a use case.
- Distillation rule of thumb when authoring seed content: if a sentence wouldn't change the AI's behavior on any plausible operator turn, cut it.
- Section bodies should be self-contained — the AI may request just one section, so headings within a section must not reference unloaded prior sections.
- This REQ creates a doc about ITSELF (`architecture/chat-and-memory.md` distilled from [[DOC-10]]). That's fine — the AI ought to understand how its own memory works.

---

## Appendix A — Transcript context

### From current conversation (operator)

> We will distill the product understanding into reference docs for 1stContact to understand

→ Direct ask. Reference docs are the AI's working knowledge of the *product itself* — what 1stContact is, how it composes sites, what the modules mean — distinct from per-site memory (the Design Brief).

### From CHAT-13 (operator, on KMS-aware shape)

> I am working on a knowledge management system that could generate mechanical summaries of documents and might be associated with a read tool that could read a section. So the summary would contain whatever the first 200-400 characters of the document plus a "table of contents" - the AI can then access the bits of the document(s) that it needs when it needs them. This doesn't exist yet but it will be available for our system before it goes live I expect in the meantime we can just stuff the whole document into the context.

→ Canonical shape: `summary (≤400 chars) + ToC + sectioned body`. KMS retrofit slots in by replacing the section-extraction path; the seed and tool surface don't change.

### From CHAT-13 (assistant, two-tier memory model)

> Two-tier memory falls out naturally:
> | Tier | What | Lifetime |
> | Working memory | Reference digests, screenshots, AI comparisons during a session | The chat |
> | Crystallized memory | The Design Brief — only things that became decisions or persistent reference material | The site |

→ With this REQ we add a third tier: **platform memory** — the reference docs themselves — global to the platform, durable, AI-consumed.

### From [[DOC-10]] §6.1

> Initial seed is distilled from foundational artifacts already in the project: DOC-4, DOC-5, DOC-7, DOC-8, DOC-9 … each module's schema … selected CHAT-* design discussions.

→ Source list for the editorial pass.
