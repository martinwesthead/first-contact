---
uid: report-f792cefd
id: REPORT-613
type: report
title: 'Capability-Intent Alignment: Builder UI (level=uat)'
created_by: xgd
created_at: '2026-06-27T01:07:52.485093+00:00'
updated_at: '2026-06-27T01:07:52.485093+00:00'
completed_at: null
last_field_updated: created_at
result: fail
fields:
  report_kind: capability_validation
  subject_uid: capability-6694c60f
  level: uat
  violations: 2
  warnings: 1
  needs_review_count: 0
---

# Capability-Intent Alignment: Builder UI
# Level: uat

**Result**: FAIL
**Violations**: 2
**Warnings**: 1
**Needs review**: 0

## Cumulative Intent Considered

This capability has a single story (STORY-46, story_kind=feature) aligned to a
single intent. No `updated_by` chain on the story, ACs, or capability — the
bundle below is the only intent that has touched the tree.

| Intent ID | Status | When | Asked / changed | Counts? |
|---|---|---|---|---|
| BUNDLE-2 (bundle-94e1d1b6) — bundles REQ-1…REQ-8; builder is REQ-8 | free_and_reconciled | merged_at_commit 8ebe122e | Phase 0 chat-driven builder SPA: two-panel shell, collapse/restore rail, splitter, viewport presets, full-height preview, 4-layer tool validation, **localStorage persistence of working site AND chat-turn history**, `/api/chat` Anthropic proxy, `/builder` static route, **starter-site fetch via `?site=`** | YES |

Story-body in-scope list (the UAT-level working reference, aligned to the bundle)
explicitly names both contested behaviours:
- "localStorage persistence of the working site definition **and the chat-turn
  history**; on reboot, a previously-edited site survives **and chat history is
  preserved across store re-instantiation**." → AC-585
- "A starter site (`/starter-sites/1stcontact.json`) is fetched at SPA boot from
  the same origin; the **`?site=` query param selects which starter to load**
  (defaults to `1stcontact`)." → AC-586

Both ACs accurately reflect active intent. No AC describes retired behaviour.

## Alignment Ledger

Each AC vs its UAT coverage (test_UAT_AC<n>_* convention). All UATs verified to
exercise real entry points (no AST/structural-only checks).

| AC | UAT | Outcome |
|---|---|---|
| AC-477 (acceptance_criterion-35f59644) — /builder serves SPA shell | test_UAT_AC477_builder_route_serves_spa_shell | aligned — drives real worker handler, asserts rewrite to /builder.html, shell markers, pass-through of /starter-sites/*.json |
| AC-478 (acceptance_criterion-bdc14eae) — collapse to 32px rail, persist+restore | test_UAT_AC478_chat_panel_collapses_to_restore_rail | aligned — real layout, collapse/restore, persisted panel state across re-mount |
| AC-479 (acceptance_criterion-a9ea366c) — rail left of preview | test_UAT_AC479_restore_rail_left_of_preview | aligned — asserts DOM order chat→splitter→rail→preview |
| AC-480 (acceptance_criterion-a5853f5e) — splitter drag/clamp/persist | test_UAT_AC480_splitter_drag_resizes_and_clamps | aligned — pointer events, in-range tracking, clamp to min/max, persist+rehydrate |
| AC-481 (acceptance_criterion-34d488ee) — viewport presets | test_UAT_AC481_viewport_presets_resize_iframe | aligned — 375/768/100% widths, exactly-one aria-pressed, desktop default |
| AC-482 (acceptance_criterion-532ca890) — iframe fills panel height | test_UAT_AC482_preview_iframe_fills_panel_height | aligned — asserts flex-column height contract (jsdom-testable equivalent of computed-height; see info finding) |
| AC-483 (acceptance_criterion-a594aab0) — accepted tool call advances site+preview | test_UAT_AC483_accepted_tool_call_advances_site | aligned — real runChatTurn, store advance, accepted=true msg, iframe CSS re-render |
| AC-484 (acceptance_criterion-1b866813) — rejected tool call, structured error | test_UAT_AC484_rejected_tool_call_leaves_state_unchanged | aligned — out-of-enum dial rejected, state unchanged, error names dial/value/enum |
| AC-485 (acceptance_criterion-41ba0a74) — site def persisted across re-mount | test_UAT_AC485_site_definition_persists_to_storage | aligned — cumulative edits persisted, re-mount hydrates, size-warning path |
| AC-486 (acceptance_criterion-88cbfc9e) — /api/chat proxies Anthropic | test_UAT_AC486_chat_endpoint_proxies_anthropic | aligned — real handleChatRequest, asserts URL/headers/model/8-tool surface/catalog system prompt/role filtering/extraction |
| AC-487 (acceptance_criterion-acce3482) — /api/chat 500/502 | test_UAT_AC487_chat_endpoint_error_status_codes | aligned — 500 no-key, 502 throw, 502 non-2xx |
| AC-585 (acceptance_criterion-287af37d) — chat-turn history persisted+restored | **NONE** | **gap: no substantive UAT; behaviour also unimplemented in store.ts** |
| AC-586 (acceptance_criterion-f503d328) — starter fetch via ?site=, 1stcontact default | **NONE** | **gap: no substantive UAT (behaviour implemented in spa.ts but untested)** |

## Findings

| # | Severity | Property | Element | Resolution category | Issue | Suggested edit |
|---|---|---|---|---|---|---|
| 1 | violation | coverage | AC-585 (acceptance_criterion-287af37d) | uat-add | No UAT exercises chat-turn history persistence/restore. The only persistence tests (test_UAT_AC485_*, test_UAT_FC_REQ-8_state_persisted_*) assert ONLY the site-definition key `1stcontact_builder_site_v1`; every `chatHistory` reference in tests just constructs a store with `[]`. The behaviour is ALSO unimplemented: `packages/builder-ui/src/store.ts` `appendChatMessage()` (lines 76–81) emits but never calls `persist()`; `persist()` (lines ~99–116) serialises only `state.siteDefinition`; the constructor (lines ~41–46) takes `chatHistory` from `initial.chatHistory` and `loadPersisted()` returns only a `Site`; `bootBuilder()` in `main.ts` always passes `chatHistory: []`. | Author a UAT that runs ≥2 chat turns (one accepted, one rejected), asserts a serialised chat-history entry is written to storage, re-mounts a fresh store against the same storage, and asserts the chat log is restored in order. NOTE: this UAT will be RED on current code — a store/bootBuilder code fix (persist chat history + hydrate it on construction) is required (code-issue downstream). |
| 2 | violation | coverage | AC-586 (acceptance_criterion-f503d328) | uat-add | No UAT exercises SPA-boot starter fetch or `?site=` selection. Behaviour IS implemented in `packages/builder-ui/src/spa.ts` (reads `?site=`, defaults to `1stcontact`, fetches `/starter-sites/<name>.json`, boots), but the boot logic is an untested top-level IIFE. test_UAT_AC477_* asserts the worker serves `/starter-sites/*.json` but does NOT exercise the SPA's fetch/`?site=` selection. | Author a UAT (or refactor the IIFE into a testable `bootFromQuery(search, fetch)` entry) that asserts: no `?site=` → fetch `/starter-sites/1stcontact.json` adopted as initial site; `?site=acme` → fetch `/starter-sites/acme.json`; empty `?site=` → default. Implementation already satisfies this, so the UAT should pass GREEN once boot is testable. |
| 3 | warning | exclusivity | 10× test_UAT_FC_REQ-8_* vs their AC-linked twins | uat-edit (consolidate) | Ten pre-reconciliation free-coded UATs duplicate the canonical AC UATs in the same shape/scenario and are not AC-traceable by name: FC builder_route≈AC-477, FC panel_collapse_restore≈AC-478, FC restore_rail_left_of_preview≈AC-479, FC splitter_drag≈AC-480, FC viewport_switch≈AC-481, FC preview_fills_panel_height≈AC-482, FC tool_call_applies_to_preview≈AC-483, FC invalid_tool_call_rejected≈AC-484, FC state_persisted_to_localstorage≈AC-485, FC chat_endpoint_invokes_anthropic≈AC-486. | Remove the redundant test_UAT_FC_REQ-8_* duplicates (the AC-linked UATs are the canonical, traceable evidence). Non-blocking; opportunistic cleanup. |
| 4 | info | consistency | AC-482 (acceptance_criterion-532ca890) | — | The UAT asserts the flex-column CSS contract (display:flex, flex-direction:column, flex:1 1 auto, min-height:0, height:100% on root and iframe) rather than measuring computed iframe height. jsdom performs no layout, so computed height cannot be measured; the structural-contract assertion is the correct testable equivalent and the AC verification text anticipates this ("Equivalently…"). | none |

## Notes for the Editor

- **The two violations are both new ACs** (AC-585, AC-586; created 2026-06-27,
  one day after the other eleven) added by the previous fix attempt
  (previous_attempt_count=1). That attempt added the ACs at the AC level but did
  NOT add their UATs — this is the residual UAT-level gap.
- **AC-585 is the higher-risk gap.** It is not merely a missing test — the
  production code does not persist or restore chat history at all (concrete
  evidence: `store.ts` `appendChatMessage` does not persist; constructor and
  `bootBuilder` always seed `chatHistory: []`). A naive `uat-add` that writes a
  passing test would be invalid; the correct path is RED UAT → code fix in the
  store/boot path. Flagging so the downstream fix loop treats this as
  coverage + code, not coverage alone.
- **AC-586 is coverage-only.** `spa.ts` already implements the `?site=` selection
  and same-origin starter fetch with the `1stcontact` default; the gap is purely
  that the boot path is an untested top-level IIFE. Extracting a small testable
  boot function is the cleanest enabler.
- AC-477 through AC-487 are fully and accurately covered; no consistency or
  exclusivity problems among them.

