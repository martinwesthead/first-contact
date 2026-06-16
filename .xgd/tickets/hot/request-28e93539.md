---
uid: request-28e93539
id: REQ-29
type: request
title: 'Inspiration onboarding: search_references + compare_references tools + AI-led
  comparative discussion'
created_by: xgd
created_at: '2026-06-16T23:30:16.350600+00:00'
updated_at: '2026-06-16T23:30:16.350600+00:00'
completed_at: null
last_field_updated: created_at
status: draft
fields:
  priority: high
  story_points: 6
  auto_merge_back: true
  needs_review: false
---

## Problem

The second killer use case per [[DOC-9]] §2.2: operator describes their business ("local plumber"), the system searches for relevant peer sites, produces a Reference Digest for each, and the AI leads a comparative conversation that crystallizes into the Design Brief. This is the *onboarding* experience — the first three minutes a new operator spends with the platform.

Two new capabilities are needed: (1) a web search tool so the AI can find candidate references from a free-text business description, and (2) the orchestration that fetches and digests the top results in parallel, presents them as a comparative report, and feeds the AI's lead-the-discussion narrative. Both ride on the foundation REQs ([[REQ-20]] / [[REQ-21]] / [[REQ-22]] / [[REQ-27]]).

## Scope

Land the `search_references` AI tool and the inspiration-onboarding flow. After this REQ:

- An AI tool call `search_references({query, count})` returns up to 5 candidate sites with title, snippet, and source URL.
- A follow-on AI tool call `compare_references({urls})` produces digests for all URLs in parallel ([[REQ-21]] / [[REQ-22]]) and emits a structured `ReferenceComparison` tool_result the chat panel renders as a comparative report (side-by-side palette, type, key messaging, AI commentary per site).
- The AI is prompted to lead the discussion ("here's what I like about A vs B"), and decisions crystallize into the Design Brief via `propose_brief_update` ([[REQ-27]]).
- The flow is bounded by the safety contract ([[REQ-20]]) — search results consume one fetch budget unit each; the comparison consumes one digest budget unit per URL.

## Decisions already made (open questions closed)

These resolve [[DOC-9]] §13 items 3 (crawl depth — inspiration) and 5 (search provider) inline:

- **Search provider** ([[DOC-9]] §13.5): **Brave Search API** for v1. Reasoning: reasonable free tier, JSON API, no aggressive lock-in, web-search-only (no ad layer). The search is wrapped behind an interface `SearchProvider` so swapping to Serper or Bing is a single-file change later.
- **Inspiration crawl depth** ([[DOC-9]] §13.3 — inspiration arm): 1 page per reference for v1 — the URL returned by the search provider. The original [[DOC-9]] §13.3 proposed 8 pages; tightening to 1 keeps the budget low and the latency tight (5 sites × 1 page × ~5s static = 25s parallel). Multi-page sampling per reference is a v1.5 enhancement.
- **Maximum references per comparison**: 5. Search returns up to 5; compare accepts up to 5. Above 5 the comparative UI becomes unreadable and the AI's discussion becomes shallow.
- **AI leads the discussion** ([[CHAT-13]] turn 2 question 2): yes — the AI is prompted post-comparison to produce a structured opening narrative naming distinct positions ("A focuses on emergency callout, B on family-business trust, C on flat-rate pricing"). The narrative is a chat turn, not a structured tool_result; the AI follows up with a question ("which positioning feels right?").
- **Search initiation**: only operator-initiated. The AI cannot invoke `search_references` without an operator-intent token ([[REQ-20]]). Onboarding flow primes the AI to ask early ("what kind of business are you setting this up for?") so the operator's first substantive answer triggers a search-with-intent.
- **Comparison persistence**: each digest in the comparison persists in the chat history as a normal digest record ([[REQ-21]]'s structured tool_result). The comparison wrapper is itself a `ReferenceComparison` tool_result that carries digest IDs and ordering, not duplicates.
- **AI commentary on the comparison**: the comparison is a *second* LLM pass (Haiku 4.5) that takes all N digest summaries + screenshots + the search query and produces a comparative narrative + positioning labels per site. This narrative is what the AI uses to lead the discussion; it lands as part of the `ReferenceComparison` payload.
- **Sparse-signal handling propagation** ([[DOC-9]] §13.9): when one or more references' digests have `not_detected` palette / type / etc., the AI's comparative narrative explicitly names the absence ("notice none of these three plumbers publish prices — that's a positioning choice we could break with"). Sparse signals become content, not silence.
- **Inspiration → Brief integration**: when the operator names a preference ("I like A's emergency-callout positioning"), the AI is expected to follow up with a `propose_brief_update` adding the reference and the positioning rationale to the Brief's `References` and `Voice & tone` sections. The Brief is the persistence target; the chat conversation is the discussion medium.

## Design conversation

Full thread: [[CHAT-13]]. Most relevant operator framing for this REQ:

> "The other very powerful on boarding experience might be something like this. I explained that I am a local plumber trying to create a new website for my new business. Our tool does a search for local plumber websites scans the top 3 to 5 and has a discussion with the user about what they like and dislike about these sites."
> — [[CHAT-13]] turn 2

> "Then yes the AI can lead the discussion with here's what I like about this site versus this one and dive into aesthetics or content or even pricing at least price presentation."
> — [[CHAT-13]] turn 3

> "An interesting observation here is that this could bring the content displayed to the AI to be much closer to the content displayed to the user. Both would be seeing some kind of digested summarized version of this site."
> — [[CHAT-13]] turn 3

The "AI leads" decision was previously settled in the design conversation; this REQ implements it via the comparative-narrative LLM pass.

## IN

### `packages/search-provider` (new package)

- `SearchProvider` interface: `search({query, count, locale?}) → Array<{url, title, snippet, source}>`.
- `BraveSearchProvider` implementation hitting Brave Search API. API key sourced from `BRAVE_SEARCH_API_KEY` secret in the control-app Worker.
- Defensive parsing: malformed Brave responses produce a typed error, not a crash.

### AI tool: `search_references`

```
input: { query: string, count?: number (1..5, default 5) }
output: { ok: true, results: Array<{url, title, snippet, source}> } | { ok: false, error: typed-error }
```

Wrapped in [[REQ-20]]'s safety middleware: rate-limit counter increments once per call, robots not applicable, no SSRF check on the search query itself (the URLs returned are checked when [[REQ-21]] fetches them).

### AI tool: `compare_references`

```
input: { urls: string[] (1..5) }
output: { ok: true, comparison: ReferenceComparison } | { ok: false, error: typed-error }
```

Where:

```typescript
type ReferenceComparison = {
  schemaVersion: 1,
  digests: Array<{ digestId: string, url: string, title: string }>,
  positioningLabels: Array<{ digestId: string, label: string, rationale: string }>,
  narrative: string,    // the AI's comparative opening — markdown
}
```

Implementation:

1. Fetch each URL in parallel via [[REQ-21]]'s `analyze_page` (each consumes a fetch-budget unit).
2. Once all digests are ready, invoke the comparative-narrative LLM pass (Haiku 4.5, multimodal — desktop screenshots from each digest fed as image inputs).
3. Return the `ReferenceComparison` structured tool_result.

Parallel digest production tolerates per-URL failures — a single URL that fails ([[REQ-20]] safety failure, robots block, oversize, etc.) is included in the comparison with a `digestId: null` + `error` field and the narrative is prompted to acknowledge the gap.

### Builder UI

`<ReferenceComparisonReport>` component consumes a `ReferenceComparison` tool_result and renders:

- Per-reference card: thumbnail screenshot, title, positioning label + rationale, palette swatches, type sample, "open digest" affordance that scrolls to the digest's individual tool_result earlier in the chat.
- Top of the comparison: the AI's comparative narrative as rendered markdown.
- Side-by-side palette / type strips across all references for at-a-glance comparison.

### Onboarding flow priming

The system prompt for new chats on freshly-created sites is augmented (when the Design Brief's `Project context` section is still `> TBD`) with a one-sentence directive: "If the operator hasn't described their business yet, ask. Once they do, call `search_references` with that business type as the query, then `compare_references` with the top 5 results, then lead a discussion about what they like and don't like."

This is a soft prompt-level nudge, not a hard-coded UI step. The operator can skip the inspiration phase by saying "I already know what I want" — the AI is also instructed to honor that.

## OUT (explicitly deferred)

- Multi-page inspiration crawl per reference (the [[DOC-9]] §13.3 8-page cap is deferred to v1.5).
- Operator-pinned reference library outside the current chat — references persist in this chat but are not aggregated cross-chat.
- Manual reference URL injection (operator-pastes a URL during inspiration) — the existing `analyze_page` tool handles single URLs; no special flow.
- Non-business-type queries — Brave is hit with whatever query the AI sends; no query rewriting in v1.
- Localized search (geo-targeted results) — `locale` parameter exists in the `SearchProvider` interface but is unused in v1.
- Saved searches / re-run last comparison.
- Pricing extraction from comparison (specifically called out in [[CHAT-13]] turn 3): the AI is prompted to comment on pricing *presentation* (whether prices appear and how), not to extract structured pricing data.

## Dependencies

- [[REQ-20]] — safety contract + operator-intent tokens + rate limits.
- [[REQ-21]] — `analyze_page` (used in parallel for each reference URL).
- [[REQ-22]] — Browser Rendering (digests carry screenshots which fuel the comparative narrative).
- [[REQ-27]] — Design Brief + `propose_brief_update` (where preferences crystallize).
- [[DOC-9]] §2.2 — inspiration onboarding use case.
- [[DOC-9]] §3.1 — convergence: same digest for user and AI.

## Acceptance criteria

1. `search_references({query: "local plumber Austin TX"})` returns up to 5 results from the Brave Search API; each result has `url`, `title`, `snippet`, `source: "brave"`.
2. `search_references` with no operator-intent token returns `missing_intent`; the AI must ask the operator before searching.
3. `compare_references({urls: [u1, u2, u3]})` produces a `ReferenceComparison` whose `digests` array has 3 entries (or 3 entries with one `digestId: null` if one URL fails).
4. The comparison's `narrative` is non-empty markdown describing at least one distinguishing positioning per reference.
5. The chat panel renders `<ReferenceComparisonReport>` showing per-reference cards with screenshots, palettes, positioning labels.
6. When one URL in the comparison fails ([[REQ-20]] safety rejection, robots block, oversize), the report renders that card with the error reason and the narrative explicitly acknowledges the gap.
7. The AI's first turn after a comparison: contains a question to the operator naming at least two distinct positionings ("emergency callout vs family business — which feels right?").
8. After the operator names a preference, the AI calls `propose_brief_update` to add the chosen positioning to the Brief's `Voice & tone` section and the reference to the `References` section. The Brief tab reflects the change after the operator applies the proposal.
9. Parallel digest production for 5 URLs completes within 40 seconds on the static-fetch path (no rendering escalations).
10. UAT — full inspiration onboarding: new site → operator says "I'm a local plumber in Austin" → AI calls `search_references`, then `compare_references` with the top 5 → comparison report renders in chat → AI proposes a positioning question → operator picks one → Brief gets updated with the chosen positioning + references. Total wall-clock from first operator message to Brief update under 3 minutes.
