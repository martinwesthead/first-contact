---
uid: comment-bcfad7a2
id: COMMENT-131
type: comment
title: Comment on request REQ-48
created_by: xgd
created_at: '2026-06-20T22:52:54.724782+00:00'
updated_at: '2026-06-20T23:17:41.749585+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  subject_uid: request-11e05ad8
  kind: chat_transcript
---

<!-- xgd-turn id="c294fb61-de05-45be-9232-83e70b5def52-user" -->

<!-- xgd-chat role="user" ts="2026-06-20T22:51:25.864Z" -->
#### You
Please read this ticket and let me know if you have any questions before you implement it

<!-- xgd-turn id="c294fb61-de05-45be-9232-83e70b5def52-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-20T22:53:22.829Z" -->
#### Claude
I've read the ticket and surveyed the codebase. Here's my understanding:

**Current state:**
- Theme palette has `bg`, `surface`, `surfaceSubtle`, `surfaceInverse`, `text`, `muted`, `primary`, `accent`, `border` (in `packages/site-schema/src/schema.ts` and `packages/framework/src/tokens/defaults.ts`).
- Modules use surface variants `default | subtle | inverse | accent` via CSS classes (e.g. `packages/framework/src/modules/hero/index.astro:81-95`). Each surface implies a (background, text) pair: `default = (bg, text)`, `subtle = (surfaceSubtle, text)`, `inverse = (surfaceInverse, bg)`, `accent = (accent, bg)`.
- `deriveThemeTokens` in `packages/extractor/src/transcribe.ts:25` produces a partial palette from the digest with no contrast check.
- The convert-flow instructions are in `docs/llm-context/reproducing-a-website.md` (already modified locally) and don't currently mention contrast verification.

**Ticket scope** (from REQ-48 body): two fixes — a **framework** enforcement of minimum contrast across surface variants, and an **instructions** update so the AI verifies/corrects low-contrast pairs after applying theme tokens during convert.

Before I implement, I need a few decisions from you:

I'll wait for your guidance on those decisions before proceeding. The four open questions in summary:

1. **Enforcement strategy** — auto-correct, warn, validator error, or both auto-correct + warn?
2. **Contrast threshold** — WCAG AA (4.5:1 / 3:1 split), simplified 4.5:1 everywhere, or AAA?
3. **AI verification mechanism** — instruct the AI to do it inline, add a `check_palette_contrast` tool, or bake it into `set_theme_token`?
4. **Pairs to check** — all four surfaces, just the three named in the ticket, or surfaces + primary CTA?

<!-- xgd-turn id="7569a9cc-c61a-43b7-8cd9-ff6010980584-user" -->

<!-- xgd-chat role="user" ts="2026-06-20T23:02:22.382Z" -->
#### You
Enforcement should be a warning

Lets go with your proposals and can you make sure the AI instructions are updated to include this feature

<!-- xgd-turn id="7569a9cc-c61a-43b7-8cd9-ff6010980584-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-20T23:17:41.746Z" -->
#### Claude
Locking in: warn (CSS comment + dev console), WCAG AA (4.5/3.0), inline check in the AI doc, all four surfaces. Let me look at the FREE-CODING doc and a recent UAT test for the established patterns before I update the ticket.

Now I have the full free-coding protocol. Let me update the ticket scope, then implement. First I'll look at a couple more bits — registry/meta and existing render to make sure I integrate the warning cleanly.

I need to think about thresholds. Quick sanity check — the default palette uses `accent: #f59e0b` (amber) which against `bg: #ffffff` is only ~2.15:1, below WCAG AA's 3.0 even for large text. Per the user's enforcement choice (warn-only), this is the system working as intended — surfacing a real contrast issue. I'll keep all four surfaces in the check; the default palette correctly produces an `accent`-surface warning. Now writing the tests.

Now (RED check first, then GREEN). Let me run the new tests to confirm they fail for the right reason, then build the implementation.

Good — RED confirmed (16 failures, all on the missing exports). Moving to GREEN.

Now wire it into `generateThemeCss` and the package exports.

All 18 UATs green. Run the full test suite to check for regressions, then update the AI doc.

Pre-existing failures (REQ-42 banner / REQ-47 image constraints), not regressions from my work. Moving on to the AI doc update.

REQ-6 passes in isolation (intermittent wrangler issue). Stderr confirms my framework warning is firing on the real 1stcontact site CSS generation. Now let me sync the inlined doc constant for REQ-30.

All 82 tests in the regression scope pass. Now run lint/typecheck and the full suite once more to confirm only the pre-existing REQ-42/REQ-47 failures remain, then commit.

Mystery solved — an xgd session auto-commit bundled my doc edit into f2d9508. The doc change is already committed under that SHA. I'll stage only my framework + tests + llm-context.ts files for the REQ-48 commit, and reference both SHAs in the ticket.

My REQ-48 work was swept into stash@{0} by an xgd sync. I'll restore only my files from that stash, not the unrelated changes.

Clean staged delta. Let me re-run the REQ-48 UATs to confirm everything is intact, then commit.

All 49 tests pass. Committing now.

Now mark the ticket free_coded with both relevant SHAs (the doc edit landed in f2d9508 via the xgd auto-sync; the framework + drift-guard edits are in 9a5a848).

Bump SHA: `6b2c84d07214a125c538f9cc17c0ec3f5bf1e8f7`. Now update the body and move to free_coded.

REQ-48 is now `free_coded` with version 0.0.23.

**What landed:**
- `packages/framework/src/tokens/contrast.ts` — `contrastRatio` (WCAG relative-luminance) + `evaluateSurfaceContrast` covering all four module surfaces (default/subtle/inverse: 4.5:1 body; accent: 3.0:1 large/CTA).
- `packages/framework/src/tokens/css.ts` — `generateThemeCss` prepends `/* fc-contrast-warning: <surface> ... */` comments and emits a single `console.warn` listing failing surfaces. Site still renders the operator's palette as-is.
- `packages/framework/src/tokens/index.ts` — public re-exports.
- `docs/llm-context/reproducing-a-website.md` — new section 1a documenting the four surface pairs, WCAG formula, and AI fix actions (re-issue `set_theme_token` or revert to defaults).
- `apps/control-app/src/llm-context.ts` — inlined doc copy synced byte-for-byte (REQ-30 drift guard).
- 18 UATs across `tests/test_UAT_FC_REQ-48_*.test.ts` covering the maths, surface mapping, threshold per surface, and warning emission. All 18 green; full vitest regression scope (REQ-3/6/28/30/48 = 82 tests) green.
- End-to-end verification: `pnpm --filter @1stcontact/public-site build` now logs `[1stcontact] theme contrast below WCAG AA on surface(s): accent` — a genuine 2.15:1 finding on the default `#f59e0b` accent.

**Commits on the ticket:**
- `9a5a848` — framework utility + integration + drift-guard sync + UATs
- `6b2c84d` — patch version bump 0.0.22 → 0.0.23

**Note on the doc commit:** the section-1a edit was swept into `f2d9508` (REQ-43 logo-strip) by an xgd auto-sync before I could commit it under REQ-48. That SHA is already claimed by REQ-43, so REQ-48 only records the two SHAs above. The doc text itself is live and correct.

Pre-existing failures in REQ-42 banner and REQ-47 image-constraint tests are unrelated to this work (confirmed by stashing my changes — they fail without me too).

<!-- xgd-chat-end -->