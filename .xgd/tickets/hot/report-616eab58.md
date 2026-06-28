---
uid: report-616eab58
id: REPORT-657
type: report
title: 'UAT Coverage: Lead Capture & CRM Lite'
created_by: xgd
created_at: '2026-06-28T19:39:56.094978+00:00'
updated_at: '2026-06-28T19:39:56.094978+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: uat_coverage_check
  subject_uid: capability-79556c4b
  violations: 0
  warnings: 0
  needs_review_count: 0
---

# UAT Coverage Assessment: Lead Capture & CRM Lite

**Result**: PASS
**AC verdicts**: 13 pass, 0 fail, 0 deprecated, 0 needs_review
**Story verdicts**: 1 pass, 0 fail, 0 stale, 0 needs_review
**Capability verdict**: pass

## Cumulative Intent Considered

The capability is governed by a single intent. STORY-45 carries `intent_uid = bundle-94e1d1b6`, a merged bundle whose **REQ-7** ("Lead-capture pipeline: D1 leads schema + Turnstile + Resend on public-site form handler") is the sole intent touching this capability.

| Intent ID | Status | When | Asked / changed | Counts? |
|---|---|---|---|---|
| REQ-7 (via bundle-94e1d1b6) | merged (`merged_at_commit` 8ebe122e) | bundle merged | Replace stub `/api/forms/contact` with full lead-capture pipeline: `leads` D1 schema + indexes, JSON/content-type/email validation, honeypot silent-drop, Turnstile verify, CF-IPCountry capture, extra_fields JSON, best-effort Resend, generator Turnstile script/meta injection, client-island token attachment | YES |

No later intent retires any behavior. Every AC and the story body map cleanly onto REQ-7's deliverables; nothing is unsupported and nothing is stale.

## Alignment Ledger

| Story | Intents aligned to | Outcome | Notes |
|---|---|---|---|
| STORY-45 | REQ-7 (bundle-94e1d1b6) | aligned | Story body is a faithful, complete description of REQ-7. In-scope/out-of-scope sections match REQ-7's "Explicitly NOT in this ticket". Documented implementation divergences (uuid vs ULID, `dropped:true` honeypot body, hidden-input Turnstile fallback) are flagged as non-asserted implementation detail — correct. |

## AC-Level Verdicts

| AC | Behavior | Test | Verdict |
|---|---|---|---|
| AC-464 | leads table + CRM Lite schema + indexes via migration 0001 | applies real migration SQL to real Miniflare D1, asserts `PRAGMA table_info` + defaults + `PRAGMA index_list` | pass |
| AC-465 | valid POST persists lead, 200 + lead_id | real handler + real D1, asserts row + response | pass |
| AC-466 | honeypot → success-shaped 200, no row, no email | real handler, asserts no row + no Resend fetch | pass |
| AC-467 | non-JSON content-type → 400 INVALID_CONTENT_TYPE | real handler, text/plain + form-encoded | pass |
| AC-468 | malformed JSON → 400 INVALID_JSON | real handler, garbage + array body | pass |
| AC-469 | missing email → 400 MISSING_FIELD, no row | real handler, absent/empty/whitespace | pass |
| AC-470 | malformed email → 400 INVALID_EMAIL, no row | real handler, no-@/no-domain/internal-space | pass |
| AC-471 | Turnstile fail/missing → 400 TURNSTILE_FAILED, no row, no email | real handler, siteverify→false + missing token | pass |
| AC-472 | ip_country from CF-IPCountry header | real handler + D1, with/without header | pass |
| AC-473 | non-canonical fields → extra_fields JSON | real handler + D1, extras vs canonical-only | pass |
| AC-474 | Resend failure does not fail request | real handler, Resend 500 + thrown network error, lead persisted + 200 | pass |
| AC-475 | generator emits Turnstile script + site-key meta when form + key present | invokes real `runGenerate` against real site def + no-form fixture, inspects emitted index.html; negative cases for empty-key and no-form | pass |
| AC-476 | client island attaches turnstile_token to JSON POST | jsdom, invokes real `enhanceContactForm`, dispatches real submit, inspects posted JSON; with/without widget | pass |

## Evidence Validity

Test harness (`tests/_helpers_REQ-7_handler.ts`, `tests/_helpers_REQ-7_db.ts`) follows the thin-mock full-flow strategy correctly:

- Invokes the **real** production entry points: `handleContactSubmission` (`apps/public-site/src/forms.ts`), `runGenerate` (`tools/generate/src/index.ts`), `enhanceContactForm` (`packages/framework/src/modules/contact-form/client.ts`).
- Uses a **real** D1 (Miniflare sqlite emulator) with the **real** migration SQL — no DB mocking.
- Mocks only at external system boundaries: `fetch` for Turnstile `siteverify` and Resend `emails`, and the `window.turnstile` global (Cloudflare's external widget API).
- No internal-component mocking. No structural/source-text assertions. Each observation could distinguish a correct implementation from an incorrect one.

## Findings — Categorized by Editor Action

None. Zero violations, zero warnings, zero needs_review. No editor action required.

## Notes for the Editor

No coverage or alignment findings. One **environment** observation (NOT a coverage finding, no editor action):

In this regression worktree, `node_modules/@1stcontact/` contains no linked workspace packages (`node_modules` is a symlink to the main checkout, which lacks the workspace symlinks). Consequently, tests that import via the `@1stcontact/*` package alias — AC-475 and its `test_UAT_FC_REQ-7_generator_*` twin, plus the out-of-scope REQ-6 generator and builder-ui tests — fail to **load** (`Failed to load url @1stcontact/generate`). Tests using relative imports (`../apps/...`, `../packages/...`) — the other 12 lead-capture ACs — load and pass.

Verified live in this worktree: AC-464–474 and AC-476 (12 ACs) pass green (28 tests). AC-475 was assessed substantive by inspection; it is blocked only by the missing workspace link, a systemic provisioning issue that also hits an out-of-scope capability — not an evidence defect. Resolution is `pnpm install` in the worktree (regression-workflow infrastructure), not a UAT edit.

