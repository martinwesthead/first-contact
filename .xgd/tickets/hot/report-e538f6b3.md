---
uid: report-e538f6b3
id: REPORT-916
type: report
title: 'Reconciliation Review: BUNDLE-10 (commits)'
created_by: xgd
created_at: '2026-06-30T06:57:34.631164+00:00'
updated_at: '2026-06-30T06:57:34.631164+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: reconciliation_review
  subject_uid: bundle-93cd5926
  anchor_uid: bundle-93cd5926
---

# Reconciliation Review: Story Coverage

**Result**: PASS
**Mode**: commits
**Surface**: (n/a — commits/bundle mode)
**Anchor**: bundle-93cd5926 (BUNDLE-10 = REQ-53 + REQ-51 + BUG-15 + BUG-17)
**Stories Reviewed**: 4 (STORY-56, STORY-71/story-bab9b773, STORY-53; plus STORY-55 as the second target of plan item 1)

## Intent vs. Code vs. Stories

Intent chain (bundle body + four source tickets + amendment comments) is internally consistent. Every commit either (a) inverts the analyze rendered/static decision, (b) builds the new preview tool, or (c) relaxes the budget cap. Code was read independently (escalate.ts absent; analyze-page.ts calls renderedFetch unconditionally at line 238 with no escalation/forceRendered gate; preview-generated-page.ts present; browser-budget.ts defaults = 1e9). Stories faithfully document the code AND carry explicit reconciliation/divergence notes where the shipped behavior departs from the original REQ body — no silent absorption.

## Behavior Inventory

15 behaviors identified across the four code areas (render-by-default analyze, preview_generated_page + 4 amendments, BUG-15 asset inlining, BUG-17 budget defaults) plus 3 non-capability plumbing changes (wrangler BROWSER remote binding, static puppeteer import, version bump).

## Coverage Map

| # | Behavior | Coverage | Story | Notes |
|---|----------|----------|-------|-------|
| 1 | analyze_page runs rendered path unconditionally; static is degraded fallback | Covered | STORY-56 | AC-617; reconciliation note documents the inversion |
| 2 | forceRendered input + shouldEscalateToRendered/escalate.ts removed | Covered | STORY-56/STORY-55 | escalate.ts deleted; former AC-597/610/611 archived (confirmed absent from active AC sets) |
| 3 | Render-by-default applies to JS-SPA and static-rich pages alike | Covered | STORY-56 | AC-622 (SPA e2e), AC-822 (static-rich) |
| 4 | Budget exhaustion degrades analyze to static without failing | Covered | STORY-56 | AC-618 (preserved) |
| 5 | Rendered-fetch primitive / computed-signal merge / screenshot upload | Covered | STORY-55 | AC-612/613/614/789/790 unchanged, now invoked on every call |
| 6 | preview_generated_page tool registered (trial tier, self-inspection spec) | Covered | STORY-71 | AC-838 |
| 7 | Default-page preview → PreviewDigest, 3 viewport screenshots under previews/ prefix | Covered | STORY-71 | AC-823 |
| 8 | previewSource provenance (account/draft/page/ISO capturedAt) | Covered | STORY-71 | AC-824 |
| 9 | Content-addressed draftId (stable across identical state + asset-byte changes) | Covered | STORY-71 | AC-825 |
| 10 | Explicit pageId selection / unknown pageId descriptive failure | Covered | STORY-71 | AC-826, AC-827 |
| 11 | inspirationDelta when compareToDigestId resolves; comparison phrase required | Covered | STORY-71 | AC-828 |
| 12 | Unresolvable compareToDigestId non-fatal with whatsMissing note | Covered | STORY-71 | AC-829 |
| 13 | Degraded paths: BROWSER absent / budget exhausted → static structural signals | Covered | STORY-71 | AC-830, AC-831 |
| 14 | data:-URL inline navigation; sourceUrl is synthetic preview:// | Covered | STORY-71 | AC-832; divergence from REQ-51 AC1 (uploaded-HTML) explicitly noted |
| 15 | BUG-15 local /assets inlining; missing asset preserves original src | Covered | STORY-71 | AC-833, AC-834 |
| 16 | PreviewDigestReport card: screenshot strip, vs-inspiration section, degraded panels | Covered | STORY-71 | AC-835/836/837 |
| 17 | BUG-17 default browser budget effectively infinite; cap only under config override | Covered | STORY-53 | AC-565/566 modified, AC-839 added |
| 18 | session-attach launchWithRetry (3dcf349) | Acceptable omission | STORY-71 | internal driver resilience; noted in tech context, no operator-visible behavior |
| 19 | requestOrigin on ActionContext | Acceptable omission | STORY-71/STORY-56 | back-compat plumbing; explicitly flagged as not-an-AC |
| 20 | wrangler BROWSER remote / static puppeteer import / version bump | Acceptable omission | — | dev/bundler plumbing; recorded as non-capability in the plan |

## Ungrounded Stories

None. No story claims behavior unsupported by intent or code.

## Plan Item Accounting

| Plan Item | Expected Story | Status |
|-----------|---------------|--------|
| 1. analyze_page rendered fetch (upgrade) | STORY-56 + STORY-55 | ✓ both carry updated_by=bundle-93cd5926; render-by-default reflected, escalate ACs archived |
| 2. preview_generated_page (feature) | STORY-71 (story-bab9b773) | ✓ new story, intent_uid=bundle-93cd5926, 16 ACs |
| 3. Browser-rendering budget defaults (upgrade) | STORY-53 | ✓ updated_by=bundle-93cd5926; AC-565/566 modified, AC-839 added |

No plan items dropped. BUG-15 correctly folded into item 2 (AC-833/834) and the four REQ-51 amendments folded into item 2 as ACs/notes rather than separate items — consistent with the plan's stated decomposition.

## Evidence Sufficiency (Step 5b)

All active bundle ACs have passing UATs that enter through real interfaces and mock only external boundaries:

- preview UATs invoke the real `previewGeneratedPageHandler` via the harness; only the puppeteer BrowserDriver, the Anthropic HTTP call, and Cloudflare KV/R2 (in-memory doubles) are mocked. AC-832/833/834 decode the actual data: URL handed to the driver and assert real inlined bytes — a broken inliner would fail. AC-825 exercises real content-addressing. AC-830/831 assert real structural-signal extraction on the degraded path.
- analyze render-by-default UATs invoke the real analyze handler, parse the digest with the real Zod schema, render the real chat card via renderToolResult/registerDigestReport, and AC-620 inspects the real Anthropic request body for the image content block. AC-618 seeds the real budget via chargeBrowserBudget.
- BUG-17 UATs (AC-565/566/839) charge/check the real budget functions against real in-memory KV, prove large charges pass under defaults AND that a finite cap re-arms under explicit config override (machinery preserved). The constant assertions are supplementary, not the sole evidence — not source-inspection.
- AC-838 verifies the live registry entry (handler is a function, trial tier, input schema, exposed description) — a runtime contract, not a .ts text scan.

Test runs (this worktree):
- Reconciliation UATs: 42/42 pass (preview_generated_page 13, web_fetch_safety 20, preview_digest_card 3, analyze_render_by_default 6).
- Free-coded bundle UATs: 26/26 pass (BUG-15, BUG-17, REQ-51 ×3, REQ-22 render-by-default).
- STORY-55 rendered primitives retain dedicated passing UATs (AC-612/613/614/789/790).

No AC was found that a broken implementation could satisfy while violating the AC.

## Judgment Calls

- launchWithRetry session-attach retry, requestOrigin threading, wrangler/puppeteer/version plumbing — omitted from ACs as immaterial: internal/dev-only, no operator-visible behavior; a developer would not be surprised. Each is explicitly recorded (story tech context or plan non-capability list), so nothing is hidden.
- STORY-71's REQ-51-AC1 divergence (uploaded-HTML → inline data: URL) and STORY-56/STORY-55's escalation→render-by-default inversion are documented as reconciliation/divergence notes, satisfying the "note, don't silently absorb" rule.

## Verdict

PASS: Stories accurately and completely document the behavior surface within the bundle's declared intent. A developer reading STORY-56, STORY-71, STORY-53 (and STORY-55) would have a correct mental model of what BUNDLE-10 intended to build and what the code does. Intent/code divergences are flagged rather than absorbed; all three plan items produced output; every active bundle AC has passing, non-circumventable UAT evidence.
