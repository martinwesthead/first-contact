---
uid: request-6c4fbbc3
id: REQ-34
type: request
title: 'Convert flow: clear existing draft to empty scaffold before AI reconstruction'
created_by: xgd
created_at: '2026-06-20T18:25:53.585952+00:00'
updated_at: '2026-06-20T18:31:57.712553+00:00'
completed_at: null
last_field_updated: status
status: in_progress
fields:
  priority: high
  story_points: 2
  auto_merge_back: true
  needs_review: false
---

## What is the user-visible change?

When the operator runs the convert flow against a new source URL, `transcribe_site` first **clears the operator's current draft** to a minimal empty scaffold (one empty home page, default theme tokens, no modules), and THEN runs the existing mirror / digest / AI-reconstruction flow on the clean slate.

After this REQ, the operator looking at the preview after a convert sees **only** what the AI created from the source — no 1stcontact residue, no stale content from a prior convert attempt.

## Why this matters now

Today the convert flow's `transcribe_site` writes asset mirrors and a digest, the AI reads the digest and calls `state_edit` tools (`set_theme_token`, `set_module_content`, `add_module`, ...) against **whatever is currently in the draft**. If the draft is the 1stcontact starter, the AI's calls land on top of 1stcontact's modules — some get mutated, some don't, the theme tokens partially clobber. The result is a confusing mix of source content, 1stcontact content, and AI-paraphrased content (the paraphrase problem itself is solved by [[REQ-33]] for body fields; but the structural contamination remains independent of that).

REQ-28 §Decisions chose "writes directly into the operator's current draft" to win the killer-demo's single-confirmation flow. That decision works only if the starting draft is empty. Since the operator's normal entry point is the 1stcontact starter, every convert is currently a destructive merge rather than a fresh build.

## Why free-coded

Behaviour-only change inside `transcribe_site`'s orchestration. No new schema, no new tool surface. Add a clearing step at the front of the mechanical phase.

## Decisions

- **"Empty scaffold" = one empty home page + default theme tokens.** A `Site` object with `pages: [{ id: 'home', slug: '/', title: '<source business name or "Untitled">', modules: [] }]`, `theme: <framework defaults>`, `nav: { pattern: 'in-page-anchors', entries: [] }`, `config: { businessName: '<source title>' }`. The renderer must already handle this case (it's what a brand-new site looks like before any modules are added) — verify, fix only if needed.
- **Clearing is unconditional on convert.** Every `transcribe_site` invocation clears, even if the draft is already empty. No "if the user has edits, preserve them" branching — the operator's safety net for accidental loss is git history / publish snapshots / the Reset button.
- **Clearing happens in `transcribe_site` itself.** Not as a separate AI tool call the LLM must remember to make. Putting it in the action handler makes it atomic with the convert and removes a possible bug surface (AI forgets to clear).
- **Order: clear → mirror → digest → AI reconstruction.** Clear runs before any mechanical work so the digest write doesn't depend on the cleared state, and the AI reads a freshly-cleared draft when it starts placing modules.
- **No backup of the cleared draft.** The user can use the Reset button to return to the 1stcontact baseline, or pull the prior state from git / D1 history if they need it. This REQ does not add a "restore previous convert" action.

## IN

### `apps/control-app/src/operator/transcribe-site.ts`

- New helper `clearDraftToEmptyScaffold(siteId, sourceUrl, sourceTitle?)`:
  - Constructs the empty scaffold `Site` object (per Decisions).
  - Calls the same persistence path used by `state_edit` actions to write it into the draft state (in-memory for the demo, D1 for the persisted case).
  - Emits an SSE `transcribe_progress` event with `{ stage: 0, status: 'cleared' }` so the operator UX surfaces the action.
- In the orchestration handler, run `clearDraftToEmptyScaffold` immediately after the destructive-confirmation gate succeeds (or immediately on entry, if [[REQ-35]] has removed that gate). Then run mirror / digest / etc.

### `packages/builder-ui/src/components/transcribe-progress.ts`

- The TranscribeProgress chat-card adds a "Stage 0: Clearing draft" line at the top. Updates in place when the SSE event arrives.

### How-to doc

- `docs/llm-context/reproducing-a-website.md` updated: the AI no longer needs to consider "the existing draft has modules I should keep or replace" — it always lands on an empty scaffold. The doc removes any language about clearing/preserving prior state.

### Tests

UATs in `tests/test_UAT_FC_REQ-XX_*`:

1. **`transcribe_site` clears the draft to scaffold before reconstruction**: stub the AI, invoke `transcribe_site` against a fixture, snapshot the draft after Stage 0 — assert it's a 1-page empty scaffold matching the spec.
2. **The cleared draft passes `validateSite`** (renderer must accept an empty-modules home page).
3. **No "merge with existing" path remains**: against a fixture, start with a populated draft (e.g. 1stcontact baseline), invoke `transcribe_site`, assert the draft after Stage 0 has zero modules — none of the prior modules survive.
4. **SSE event fires**: assert a `transcribe_progress` event with `stage: 0, status: 'cleared'` is emitted before the digest write begins.

Regression scope: REQ-28 and REQ-30 transcribe-site UATs — update assertions to expect a cleared starting state (the existing tests that asserted "the AI's tool calls landed on top of the seeded site" must now assert "the AI's tool calls landed on an empty site").

## OUT

- A "preview vs commit" workflow where convert runs into an ephemeral preview state and the operator promotes to the real draft. Out of scope for now — clean-on-convert is the simpler shape and the Reset button covers the accidental-overwrite case.
- A "convert into a new site" UX where the converted result lands in a separate site record (not the active draft). Multi-site work is deferred.
- A "soft clear" mode that preserves any theme tokens / modules the operator has manually pinned. No pinning mechanism exists yet; not adding one here.

## Dependencies

- [[REQ-28]] — transcribe_site orchestration (this REQ extends its first stage).
- [[REQ-30]] — convert flow rework (the AI reconstruction this REQ's clear precedes).
- [[REQ-33]] — markdown content union (orthogonal but lands first; verbatim copy enforcement works regardless of clear-on-import).

## Acceptance criteria

1. `transcribe_site` against any starting draft state clears the draft to a 1-page empty scaffold before the mirror/digest phase begins.
2. The empty scaffold passes `validateSite` and renders without error (empty home page, default theme).
3. After a successful convert against a populated source, the draft contains only modules / pages / theme tokens the AI produced from the source — no modules / pages / theme tokens carried over from the starting draft.
4. The cleared scaffold's `config.businessName` is populated from the source's site title (digest's `sourceTitle` or page-1 `<title>`).
5. An SSE `transcribe_progress` event with `{ stage: 0, status: 'cleared' }` fires before any digest write, and the TranscribeProgress chat-card surfaces it.
6. `docs/llm-context/reproducing-a-website.md` no longer instructs the AI to consider existing-draft state; it assumes an empty starting scaffold.

## Story points

2. Single action handler change + scaffold builder + SSE event + doc update + ~4 UATs.

## Notes for reconcile

- REQ-28's `test_UAT_FC_REQ-28_transcribe_site_stages.test.ts` currently asserts that the AI's `set_module_content` calls overlay onto the 1stcontact baseline. Those assertions need to flip to "calls onto an empty scaffold."
- REQ-30's killer-demo UAT assertions should pass unchanged — the test fixture exercises the AI reconstruction independently of whether the starting state was populated.