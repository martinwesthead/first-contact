---
uid: report-28beafde
id: REPORT-897
type: report
title: 'Reconciliation Plan: BUNDLE-10 (REQ-53 + REQ-51 + BUG-15 + BUG-17)'
created_by: xgd
created_at: '2026-06-30T06:04:23.618014+00:00'
updated_at: '2026-06-30T06:04:23.618014+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: reconciliation_plan
  subject_uid: bundle-93cd5926
  anchor_uid: bundle-93cd5926
  items:
  - index: 1
    component: analyze_page rendered fetch (Analyze action + Reference Digest extractor)
    item_type: upgrade
    story_points: 2
    dependencies: []
    description: 'Document that analyze_page now renders by default: the Browser-Rendering
      path runs unconditionally on every call and the static path is the degraded
      fallback (BROWSER missing / budget exhausted / driver throws). The forceRendered
      tool input and the shouldEscalateToRendered escalation heuristic (packages/extractor/src/escalate.ts)
      are removed.'
    justification: STORY-56 (analyze_page action) and STORY-55 (rendered-capture extractor
      + escalation heuristic) already own this behavior but both describe a static-first
      / conditional-escalation / forceRendered model the code no longer implements.
      This extends the existing capability bucket in place — no new action, no parallel
      implementation, no new capability bucket.
    story_uid: null
    target_story_ids:
    - STORY-56
    - STORY-55
    acceptance_criteria_changes:
      add:
      - analyze_page renders a static-rich (non-SPA) page by default, returning rendered
        fetchPath and screenshots even when static signals would have sufficed (REQ-22
        AC13).
      modify:
      - 'AC-617: reframe from ''analyze_page escalates to the rendered path'' to ''analyze_page
        renders by default'' — rendered fetchPath, computed typography, and all three
        screenshot keys are produced unconditionally, with no escalation-heuristic
        gate.'
      - 'AC-622: reframe the JS-SPA end-to-end from ''escalates analysis'' to ''renders
        by default'' — the same render-by-default path applies whether the page is
        static-rich or a JS-SPA.'
      - 'STORY-55 user story + description: remove the conditional ''when static HTML
        is too thin or JS-dominant — escalated'' framing; the JS-rendered capture
        is invoked unconditionally by the analyze action, and the shouldEscalateToRendered
        heuristic / escalate.ts primitive is removed from packages/extractor.'
      remove:
      - The optional forceRendered analyze_page tool-input parameter and its force-escalation
        behavior (the three escalation-heuristic UATs were deleted).
    intent_delta_summary: 'Invert the rendered-vs-static decision in analyze_page:
      rendered runs on every call; static becomes the degraded fallback. Remove the
      forceRendered input and the shouldEscalateToRendered heuristic (escalate.ts
      deleted). Preserve AC-618 (budget exhaustion degrades to static without failing).
      Behavior of the existing analyze action and extractor changed in place; no new
      capability bucket.'
  - index: 2
    component: preview_generated_page (AI draft self-preview)
    item_type: feature
    story_points: 3
    dependencies: []
    description: 'Document the new preview_generated_page operator tool that closes
      the AI perception loop: it renders the operator''s active draft page server-side
      (@gendev/framework), inlines local /assets R2 references as data: URLs, navigates
      Browser Rendering via a data:text/html URL, captures three-viewport screenshots
      under the previews/ R2 prefix, and returns a PreviewDigest (ReferenceDigest
      + previewSource provenance). When given compareToDigestId it emits a multimodal
      Haiku 4.5 inspirationDelta; on a degraded path (BROWSER absent / budget exhausted)
      it surfaces structural signals from the in-memory HTML with fetchPath=''static''.
      A <PreviewDigestReport> chat card renders the screenshot strip, signal panels,
      and vs.-inspiration delta. ActionContext gains requestOrigin.'
    justification: 'No existing story documents inspecting the operator''s OWN draft.
      This is a genuinely new capability bucket, distinct from STORY-56''s analyze_page
      (external reference URL): new schema type (PreviewDigest/previewSource), new
      R2 prefix (previews/), new chat card, content-addressed draftId, data:-URL navigation
      with session-attach retry, and BUG-15 asset inlining. It reuses REQ-22''s rendered
      pipeline but neither re-expresses nor replaces analyze_page, so it is a feature,
      not an upgrade. BUG-15 (asset inlining) and the REQ-51 amendments (degraded
      structural signals, data:-URL navigation + retry) are correctness behaviors
      of this same tool and fold in as ACs rather than separate items.'
    story_uid: null
  - index: 3
    component: Browser-rendering compute budget defaults (External Fetch Safety)
    item_type: upgrade
    story_points: 1
    dependencies: []
    description: Document that DEFAULT_BROWSER_BUDGET was raised from {50s session,
      200s day} to {1e9, 1e9}, so the cap never fires for production callers using
      defaults. The enforcement machinery (KV counters, BROWSER_BUDGET_KV binding,
      per-call config override) is intact and is now exercised in tests via an explicit
      small config.
    justification: STORY-53 already owns the platform-wide browser-rendering compute
      budget contract; AC-565/AC-566 hard-code the 50s/200s defaults the code no longer
      uses. This changes the existing safety contract's defaults in place — no new
      capability bucket and no parallel budgeting mechanism is introduced.
    story_uid: null
    target_story_ids:
    - STORY-53
    acceptance_criteria_changes:
      add:
      - With no config override, a large browser-second charge (e.g. 100000 s) against
        a fresh session is accepted (ok:true), and DEFAULT_BROWSER_BUDGET session/day
        constants are >= 1e9.
      modify:
      - 'AC-565: the DEFAULT per-chat-session browser budget is effectively infinite
        (1e9 s); a finite session cap is enforced only when an explicit config override
        is supplied.'
      - 'AC-566: the DEFAULT per-account-day browser budget is effectively infinite
        (1e9 s); a finite day cap is enforced only when an explicit config override
        is supplied.'
      remove: []
    intent_delta_summary: Raise DEFAULT_BROWSER_BUDGET to 1e9 s for both windows so
      the cap effectively never fires by default, while preserving the enforcement
      machinery and per-call config override (now exercised under explicit small config
      in tests). The existing budget contract's defaults change in place; no new bucket.
---

# Reconciliation Plan

**Mode**: commits
**Anchor**: bundle-93cd5926 (BUNDLE-10 — REQ-53 + REQ-51 + BUG-15 + BUG-17)
**Subject epic**: bundle-93cd5926 (bundle is a first-class reconcile intent)

## Intent (Step 0)

The bundle aggregates four free-coded source tickets, all landed 2026-06-24/25:

- **REQ-53** — straggler split from REQ-22: `analyze_page` renders by default (commit 72effe61).
- **REQ-51** — AI closed-loop preview: a new `preview_generated_page` tool that renders the operator's own draft, screenshots it, and (optionally) emits a textual inspiration delta. Shipped with four in-flight amendments (degraded-mode structural signals, wrangler BROWSER remote binding, static puppeteer import, data:-URL navigation + session-attach retry).
- **BUG-15** — preview screenshots don't load `/assets/<key>` images; inline local R2 assets as data: URLs before handing HTML to the headless browser.
- **BUG-17** — raise Browser-Rendering budget defaults to effectively infinite (1e9 s); enforcement machinery + per-call config override preserved.

The chain of authority (body + amendment comments + diffs) is consistent: every commit either inverts the analyze rendered/static decision, builds the new preview tool, or relaxes the budget cap. No contradictions between stated intent and code.

## Behavior Inventory (Step 1)

```yaml
behavior_inventory:
  source: "free-coded commits on bundle-93cd5926"
  features:
    - name: "analyze_page render-by-default (REQ-53)"
      entry_point: "apps/control-app/src/operator/analyze-page.ts; packages/extractor"
      behaviors:
        - "Rendered Browser-Rendering path runs unconditionally on every analyze_page call"
        - "Static path is now the degraded fallback (BROWSER missing / budget exhausted / driver throws)"
        - "forceRendered tool-input parameter removed from analyze_page input schema"
        - "shouldEscalateToRendered heuristic + escalate.ts deleted from packages/extractor"
        - "3 escalation-heuristic UATs deleted; render-by-default UAT added for static-rich pages"
    - name: "preview_generated_page closed-loop AI self-preview (REQ-51 + amendments)"
      entry_point: "apps/control-app/src/operator/preview-generated-page.ts; packages/extractor/src/preview-digest.ts; packages/builder-ui/src/components/preview-digest-report.ts"
      behaviors:
        - "New trial-tier system_action preview_generated_page registered in the operator registry"
        - "Renders the active draft page server-side via @gendev/framework renderSiteToHtml"
        - "PreviewDigest schema = ReferenceDigest + previewSource {accountId, draftId, pageId, capturedAt}"
        - "draftId is content-addressed (first 16 hex of rendered-HTML SHA-256); stable across identical state"
        - "Navigates Browser Rendering via a data:text/html;base64 URL (no localhost round-trip); sourceUrl is a synthetic preview:// identifier"
        - "launchWithRetry() retries puppeteer.launch once on the session-attach race"
        - "Three-viewport screenshots persisted under previews/{accountId}/{draftId}/{pageId}/ prefix"
        - "Multimodal Haiku 4.5 inspirationDelta when compareToDigestId resolves and both desktop screenshots present; requires a comparison phrase"
        - "Unknown/unresolvable compareToDigestId returns digest with inspirationDelta undefined + whatsMissing entry (no error)"
        - "Degraded path (BROWSER absent / budget exhausted) runs extractSignals over in-memory HTML, fetchPath='static', degradation reason at whatsMissing[0]"
        - "ActionContext gains requestOrigin (populated by chat handler + operator router)"
        - "<PreviewDigestReport> chat card: screenshot strip + signal panels + vs.-inspiration delta section"
    - name: "preview asset inlining (BUG-15)"
      entry_point: "apps/control-app/src/operator/preview-generated-page.ts"
      behaviors:
        - "Scans rendered HTML for /assets/<key> refs in src=\"...\" and CSS url(...)"
        - "Fetches each unique key once from ASSETS_BUCKET (R2), rewrites to data:<contentType>;base64,<bytes>"
        - "Missing keys preserve original src (graceful degradation, no silent drop)"
        - "Un-inlined HTML still drives draftId so content-addressing stays stable"
    - name: "browser-budget defaults effectively infinite (BUG-17)"
      entry_point: "packages/web-fetch-safety/src/browser-budget.ts"
      behaviors:
        - "DEFAULT_BROWSER_BUDGET raised from {50s session, 200s day} to {1e9, 1e9}"
        - "Cap never fires for production callers using defaults; 100000s charge on a fresh session is accepted"
        - "Enforcement machinery (KV counters, BROWSER_BUDGET_KV, per-call config override) intact; tests exercise it via explicit small config"
  non_capability_plumbing:
    - "wrangler.toml top-level BROWSER remote binding (93a59eb) — dev-only enablement, no AC"
    - "static import @cloudflare/puppeteer (61e805e) — bundler fix so the rendered path resolves at runtime, no user-visible AC"
    - "package.json version bump 0.0.38 -> 0.0.39 (313216d7) — no capability"
```

## Coverage Map (Step 3)

```yaml
coverage_map:
  - feature: "analyze_page render-by-default (REQ-53)"
    status: partial
    existing_stories: ["STORY-56", "STORY-55"]
    existing_acs: ["AC-617", "AC-622", "AC-618"]
    gaps:
      - "STORY-56 describes static-first + conditional escalation + forceRendered; code now renders unconditionally"
      - "AC-617 frames rendered path as reached via escalation; it is now the default path"
      - "AC-622 frames SPA case as 'escalates'; render-by-default makes this unconditional"
      - "STORY-55 owns the shouldEscalateToRendered heuristic (escalate.ts), now deleted"
    notes:
      - "AC-618 (budget exhaustion degrades to static) remains TRUE and is preserved"
  - feature: "preview_generated_page (REQ-51 + amendments + BUG-15)"
    status: uncovered
    existing_stories: []
    gaps:
      - "No story documents inspecting the operator's OWN draft (vs analyze_page's external reference URL)"
      - "PreviewDigest schema, previews/ R2 prefix, <PreviewDigestReport> card, requestOrigin, asset inlining all undocumented"
    notes:
      - "Genuinely new capability bucket — sibling to analyze_page, not an extension of it"
  - feature: "browser-budget defaults effectively infinite (BUG-17)"
    status: partial
    existing_stories: ["STORY-53"]
    existing_acs: ["AC-565", "AC-566"]
    gaps:
      - "AC-565/AC-566 assert the 50s/200s defaults the code no longer uses"
      - "No AC for 'defaults effectively infinite; enforcement only under explicit config override'"
```

## Plan Items (Step 4)

| # | Component | Type | Points | Deps | Description |
|---|-----------|------|--------|------|-------------|
| 1 | analyze_page rendered fetch | upgrade | 2 | - | Render-by-default; static is degraded fallback; forceRendered + escalation heuristic removed (REQ-53). Targets STORY-56 + STORY-55 |
| 2 | preview_generated_page (AI draft self-preview) | feature | 3 | - | New tool: PreviewDigest, data:-URL nav + retry, asset inlining, degraded structural signals, PreviewDigestReport card, requestOrigin (REQ-51 + amendments + BUG-15) |
| 3 | Browser-rendering budget defaults | upgrade | 1 | - | Defaults raised to effectively infinite; enforcement preserved via config override (BUG-17). Targets STORY-53 |

## Observations

- **Bundle decomposes to 3 plan items, not 4** — BUG-15 (asset inlining) is not a separable capability; it is a correctness AC of the new preview tool, so it folds into item 2. Likewise the four REQ-51 amendment commits (1ece0cc degraded signals, 3dcf349 data-URL nav + retry) are observable behaviors of the same tool and fold into item 2.
- **Three commits carry no capability AC**: 93a59eb (wrangler BROWSER remote binding) and 61e805e (static puppeteer import) are dev/bundler enablement for the rendered path; 313216d7 is a version bump. They are recorded in the inventory as plumbing and intentionally produce no plan item.
- **Item 1 targets two stories.** STORY-56 owns the analyze_page action (render decision, forceRendered input); STORY-55 owns the extractor escalation heuristic (escalate.ts / shouldEscalateToRendered) that was deleted. Both carry stale conditional-escalation language. AC-618 (budget degradation) is explicitly preserved.
- **Item 2 is feature, not upgrade.** preview_generated_page is a new capability bucket (inspect the operator's own draft) distinct from STORY-56's analyze_page (inspect an external reference URL): new schema type (PreviewDigest/previewSource), new R2 prefix (previews/), new chat card. It reuses REQ-22's rendered pipeline but does not re-express or replace analyze_page — reuse-first bias does not make it an upgrade.
- **No regression/scope-creep (Step 3b).** Every code change is declared by its owning ticket. The shared touch-point — uploadScreenshots() gaining a {pathPrefix} discriminated union and ActionContext gaining requestOrigin — is back-compat-only (existing callers unchanged), so no other intent's stories are disturbed.
- **FC tests on disk** (test_UAT_FC_REQ-51_*, test_UAT_FC_BUG-15_*, test_UAT_FC_BUG-17_*, test_UAT_FC_REQ-22_render_by_default_static_rich) are all covered: REQ-22 render-by-default -> item 1; REQ-51/BUG-15 -> item 2; BUG-17 -> item 3. No orphans.
