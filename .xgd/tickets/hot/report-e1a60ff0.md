---
uid: report-e1a60ff0
id: REPORT-634
type: report
title: 'Reconciliation Review: commits (BUNDLE-3)'
created_by: xgd
created_at: '2026-06-27T01:59:56.963123+00:00'
updated_at: '2026-06-27T01:59:56.963123+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: reconciliation_review
  subject_uid: bundle-bbb1bd9c
  anchor_uid: bundle-bbb1bd9c
---

# Reconciliation Review: Story Coverage

**Result**: PASS
**Mode**: commits
**Anchor**: bundle-bbb1bd9c (type=bundle — first-class intent)
**Stories Reviewed**: 6 (story-a07c8ed3, story-ba9f2715, story-a0482aed, story-13685321, story-3f73931a, story-15bae45e)
**ACs verified**: 64 new bundle ACs (AC-544..AC-584, AC-587..AC-609) + AC-486 (modified). AC-585/AC-586 do not exist (numbering gap, not an orphaned AC).

## Method

Intent read first (bundle body embeds all four source REQs verbatim — REQ-9, REQ-20, REQ-13, REQ-21; no comments on the bundle). Code and tests then read independently per story. Every active AC's UAT was inspected for Step-5b evidence sufficiency (real entry point, no repo-owned mocking, observable assertions, not source-inspection, distinguishes correct vs broken). All 64 ACs appear in the regression's passing test_filter (REPORT-633 / report-d21cb46a: 76 passed, 0 failed; lint+build clean).

## Behavior Inventory

7 behavior clusters identified in the four commits (483b0b5 REQ-9, d1cadff REQ-20, 8a2721d REQ-13, 2bf2e4e REQ-21):
1. Operator API namespace + OPERATOR_ACTIONS registry + plan-tier middleware + SSE multiplexed channel + system-action execution + parity-audit scaffolding (REQ-9)
2. Chat tool list derived from registry filtered by plan tier (REQ-9 chat upgrade)
3. Web fetch safety contract: SSRF/scheme/redirect/size/cache/robots/rate-limit/browser-budget/intent-token + health endpoint (REQ-20 pt1)
4. R2 ASSETS_BUCKET binding + 4 CRUD routes (REQ-20 pt2)
5. Multi-turn chat loop + tool_results + get_site_definition + marked/DOMPurify + TipTap + ChatCard + dispatcher (REQ-13)
6. Reference Digest schema + 5 Layer-A extractors + KMS markdown renderer + escalation hook (REQ-21 pt1)
7. analyze_page action (safety+cache+robots+rate+fetch+extractors+Haiku commentary) + DigestReport chat-card (REQ-21 pt2)

## Coverage Map

| # | Behavior | Coverage | Story | Notes |
|---|----------|----------|-------|-------|
| 1 | Operator API / registry / SSE / plan-tier (REQ-9) | Covered | story-a07c8ed3 | AC-544..552. SSE (548/549/550) exercised against the real session event bus through worker.fetch — not mocked. |
| 2 | Chat tool list filtered by plan tier | Covered | story-ba9f2715 | AC-553/554 drive real handleChatRequest with trial/paid headers and inspect the actual outgoing Anthropic tools array. |
| 3 | Web fetch safety contract (REQ-20 pt1) | Covered | story-a0482aed | AC-555..573. All count boundaries (21st/11th/101st call, 50s/200s budget, 60s token expiry, per-chat robots isolation) genuinely driven. No limit-value divergences. |
| 4 | R2 assets CRUD (REQ-20 pt2) | Covered | story-13685321 | AC-574..579. CRUD through real worker.fetch; AC-579 runs against real Miniflare R2 (getPlatformProxy). |
| 5 | Multi-turn chat / markdown / ChatCard (REQ-13) | Covered | story-ba9f2715 | AC-486 (mod), AC-580..584. Real marked+DOMPurify pipeline + real TipTap editor inspected in jsdom. |
| 6 | Reference Digest schema + extractors (REQ-21 pt1) | Covered | story-3f73931a | AC-587..597. Real HTML fixtures → asserted parsed output; Zod validator run on valid+invalid; markdown H1/ToC/section structure inspected. |
| 7 | analyze_page + DigestReport (REQ-21 pt2) | Covered | story-15bae45e | AC-598..609. Safety failures injected through REAL robots/rate/SSRF layers; cache short-circuit proven by spy call-counts; AI commentary fallback exercised with key-absent/503. |

No uncovered behaviors. No partial coverage rising to materiality.

## Intent Fidelity

All six stories are grounded in intent and faithful to the operator's stated purpose. One intent→code divergence found, and it is **flagged, not silently absorbed**:

- **SSE 15s heartbeat (REQ-9):** intent + original AC-548 specified a 15s heartbeat; shipped events.ts emits only the `: connected` open frame and forwards events. AC-548 was explicitly amended during stabilization with a recorded "Note (stabilization)" deferring the heartbeat. This is the correct handling per the review contract (capture intent, note the discrepancy) — acceptable.
- **anonymous→trial collapse (REQ-9):** intent mentions an "anonymous" account id; code collapses anonymous to trial tier. Story body documents this explicitly. Faithful.

No invented behavior. No ungrounded stories.

## Ungrounded Stories

None.

## Plan Item Accounting

| Plan Item | Expected Story | Status |
|-----------|---------------|--------|
| 1. Operator API (feature) | story-a07c8ed3 | OK |
| 2. Builder UI / chat handler — tool list filtering (upgrade STORY-46) | story-ba9f2715 (AC-553/554) | OK |
| 3. Web Fetch Safety (feature) | story-a0482aed | OK |
| 4. Assets Storage (feature) | story-13685321 | OK |
| 5. Builder UI / chat panel — multi-turn (upgrade STORY-46) | story-ba9f2715 (AC-486 mod + AC-580..584) | OK |
| 6. Reference Digest extractors (feature) | story-3f73931a | OK |
| 7. analyze_page + DigestReport (feature) | story-15bae45e | OK |

All 7 plan items produced output. Items 2 and 5 both land on STORY-46 (story-ba9f2715) as the two anticipated upgrades — both AC change-sets applied. No plan items dropped.

## Evidence Sufficiency (Step 5b)

62 of 64 ACs carry strong evidence: real entry points (worker.fetch, handleChatRequest, createChatPanel/createChatCard/renderToolResult, pure extractor functions), no repo-owned internal mocking (only the Anthropic API and outbound network are stubbed at the boundary; KV/R2 via Miniflare or faithful in-memory stand-ins), observable assertions that fail if the behavior is removed. No source-inspection tests. Cache short-circuits (AC-600) and safety-failure propagation (AC-601/602/603) are proven through the real safety layer, not mocks.

Three documented concerns (none a FAIL — see Judgment Calls):

1. **AC-551 parity-audit half (CONCERN).** The registry-exposure-via-AI-tool-list half is genuinely tested (real handleChatRequest, inspects outgoing tools). The parity-audit half is verified by an INLINE RE-IMPLEMENTATION of the audit classification inside test_reconciliation_operator_dispatch_namespace.test.ts (~lines 485-505) rather than by executing the actual tools/parity-audit.ts CLI. A bug in the real CLI (exit code, stdout columns, import path) would not be caught; the test would pass even if tools/parity-audit.ts were deleted.
2. **AC-576 etag rotation (CONCERN, mitigated).** The fake-backed test (test_UAT_AC576) bumps etags via a module-global counter, so "etag changed" is guaranteed regardless of content. Mitigated: AC-579 exercises the same overwrite-rotates-etag behavior against real Miniflare R2 with content-derived etags.
3. **8-iteration tool-loop cap (coverage gap).** MAX_TOOL_TURNS=8 (chat.ts) is implemented but no AC/UAT drives >=8 consecutive tool_use turns to prove the loop terminates at the cap. The loop mechanics and per-iteration state recompute ARE covered (AC-486); only the terminating boundary of the safety cap is untested.

## Judgment Calls

- **AC-551 parity-audit → CONCERN, not FAIL.** The parity-audit is explicitly "scaffolding ... future-proofing for CI matrix audits" per REQ-9, not user-visible runtime behavior; the registry data it reports over is independently validated by AC-551's tool-list assertions and the registry-shape assertions. Materiality test (would a developer be surprised) leans acceptable. Recommended remediation: add a UAT that runs tools/parity-audit.ts as a subprocess and asserts its exit code + stdout columns.
- **AC-576 → CONCERN, not FAIL.** The user-visible behavior (overwrite rotates the etag; stale If-Match is rejected) is proven against real Miniflare R2 in AC-579 within the same story. The fake-backed test's weakness does not leave the behavior unproven.
- **8-iteration cap → recommendation, not FAIL.** A safety bound, not user-visible behavior; the multi-turn loop and state recompute are proven. Recommended: one UAT with 8 consecutive tool_use stubs asserting exactly 8 upstream calls and graceful termination.
- **SSE heartbeat → acceptable.** Divergence is flagged in AC-548, not absorbed.

## Verdict

PASS. Stories accurately and faithfully document what the operator intended to build across REQ-9 / REQ-20 / REQ-13 / REQ-21. A developer reading these stories would have a correct mental model of the bundle. All 7 plan items produced output, all 64 active ACs have passing UATs that enter through real interfaces and cannot be passed by a materially-broken user-visible implementation, and the single intent→code divergence (SSE heartbeat) is flagged rather than silently absorbed. The three evidence-strength concerns (AC-551 parity-audit re-implementation, AC-576 fake-backed etag, untested 8-turn cap) are documented for follow-up; none concerns user-visible behavior left unproven, and each has a specific, optional remediation.
