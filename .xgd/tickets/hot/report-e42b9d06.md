---
uid: report-e42b9d06
id: REPORT-893
type: report
title: 'Reconciliation Review: commits (BUNDLE-9)'
created_by: xgd
created_at: '2026-06-30T05:52:23.893071+00:00'
updated_at: '2026-06-30T05:52:23.893071+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: reconciliation_review
  subject_uid: bundle-44f53d53
  anchor_uid: bundle-44f53d53
---

# Reconciliation Review: Story Coverage

**Result**: PASS
**Mode**: commits
**Surface**: (n/a — commits mode)
**Anchor**: bundle-44f53d53 (BUNDLE-9 — REQ-23 + REQ-24 + REQ-25 + REQ-50 + BUG-8)
**Stories Reviewed**: 4 (STORY-69, STORY-70, STORY-46, STORY-38)

## Behavior Inventory

24 behaviors identified across the 12 free-coded commits, grouped by REQ:

- **REQ-23 schema (b6dd188f):** chat_sessions (FK sites CASCADE + site/last-activity index); chat_messages (FK CASCADE, UNIQUE(session,ord), session/ord index); chat_messages_fts FTS5 + AI/AD/AU triggers; reference_docs (+toc/body/kind index) + reference_docs_fts + triggers; reversible down-migrations leaving accounts/sites/revisions intact; *Record TS types.
- **REQ-24 HTTP API (85705dd):** POST/GET sessions (create + site-scoped newest-first paginated list); POST/GET messages (atomic gap-free ordinal append + denorm update via D1.batch; tail read + before-cursor paging); DELETE (cascade + R2 attachment sweep); PATCH title; GET reference-docs list; GET reference-doc by slug + section slicing with full-body fallback.
- **REQ-24 chat handler (85705dd):** POST /api/chat server-resident history (rejects `history` -> 400); tail-prime by CHAT_TAIL_CHARS (default 5000); 4 site-scoped server-executed memory tools not surfaced as FE SSE; first-turn title derivation; SSE streaming parity.
- **REQ-25 builder UI (46109cd -> 7e91942 -> b2ece207):** API-backed paginated store replacing in-memory/localStorage transcript; tail-load on boot + infinite-scroll-up with scroll anchoring; single auto-managed session per (site,browser), no session-mgmt UI (net-landed after second-pass removal); in-panel boot/mid-send error surface.
- **BUG-8 (efc642cc):** three default-fetch sites bound to globalThis.
- **REQ-50 (3847ff00):** @1stcontact/* -> @gendev/* scope rename across manifests/imports/CI/filter-scripts; ui-kit removed; four empty productization skeletons; product slug 1stcontact unchanged; build/output byte-stable.

## Coverage Map

| # | Behavior | Coverage | Story | Notes |
|---|----------|----------|-------|-------|
| 1 | chat_sessions store + site/last-activity access path | Covered | story-1e174b7c | AC-793 |
| 2 | chat_messages append-only, unique ordinal, tail index | Covered | story-1e174b7c | AC-794 |
| 3 | message FTS consistent across insert/update/delete | Covered | story-1e174b7c | AC-795 |
| 4 | per-site-scoped message FTS | Covered | story-1e174b7c | AC-796 |
| 5 | cascade delete (site->session->message->FTS) | Covered | story-1e174b7c | AC-797 |
| 6 | reference_docs store + FTS over title/summary/body + kind filter | Covered | story-1e174b7c | AC-798 |
| 7 | reversible migrations leaving base schema intact | Covered | story-1e174b7c | AC-799 |
| 8 | create session (returns full record, appears in listing) | Covered | story-721e8feb | AC-800 |
| 9 | site-scoped newest-first listing + limit + before-cursor | Covered | story-721e8feb | AC-801 |
| 10 | atomic gap-free ordinal append + denorm update | Covered | story-721e8feb | AC-802 |
| 11 | message read: no-cursor recent page, ascending | Covered | story-721e8feb | AC-803 |
| 12 | message read: before-cursor older page, contiguous | Covered | story-721e8feb | AC-804 |
| 13 | title edit (reject empty/unknown) | Covered | story-721e8feb | AC-805 |
| 14 | delete session: cascade + R2 sweep + report keys | Covered | story-721e8feb | AC-806 |
| 15 | reference-doc list (slug/title/summary/kind; empty ok) | Covered | story-721e8feb | AC-807 |
| 16 | reference-doc read full + not-found | Covered | story-721e8feb | AC-808 |
| 17 | reference-doc section slicing + full-body fallback | Covered | story-721e8feb | AC-809 |
| 18 | append role/content validation + unknown-session 404 | Covered | story-721e8feb | AC-810 |
| 19 | POST /api/chat SSE turn loop, server reads stored session | Covered | story-ba9f2715 | AC-486 (modified) |
| 20 | server-authoritative history (rejects `history` 400) + boundary validation | Covered | story-ba9f2715 | AC-811 |
| 21 | append-then-tail-prime by CHAT_TAIL_CHARS | Covered | story-ba9f2715 | AC-812 |
| 22 | 4 site-scoped memory tools, no FE SSE | Covered | story-ba9f2715 | AC-813 |
| 23 | first-turn title derivation, stable after | Covered | story-ba9f2715 | AC-814 |
| 24 | server-resident history restored from session tail on remount | Covered | story-ba9f2715 | AC-585 (modified) |
| 25 | tail-load + infinite-scroll-up with anchoring | Covered | story-ba9f2715 | AC-815 |
| 26 | single auto-managed session per (site,browser), no session UI | Covered | story-ba9f2715 | AC-816 |
| 27 | boot/mid-send failure surfaced in-panel | Covered | story-ba9f2715 | AC-817 |
| 28 | default fetch bound to globalThis (BUG-8) | Covered | story-ba9f2715 | AC-818 |
| 29 | @gendev scope rename, no surviving @1stcontact import, slug unchanged | Covered | story-067dc2f8 | AC-819 |
| 30 | four productization skeletons + ui-kit removed | Covered | story-067dc2f8 | AC-820 |
| 31 | rename build/output parity (byte-stable) | Covered | story-067dc2f8 | AC-821 |

No uncovered or partially-covered behaviors. The FTS5 free-text token-quoting safeguard is an implementation detail subsumed by the FTS search ACs (795/796/798) and not separately material.

## Ungrounded Stories

None. Every story claim is grounded in both the intent (REQ-23/24/25/50/BUG-8) and the commit diffs. No invented behavior.

## Intent Fidelity

All intent-declared behaviors are faithfully represented, and every intent/code divergence is explicitly flagged in the story bodies rather than silently absorbed:

- **STORY-69** notes the migration-naming divergence (DOC-10 said 005/006/007; landed 0006/0007/0008 because 0005 is the 1stcontact seed) and the type-naming divergence (ChatSession -> ChatSessionRecord(+Parsed) etc., matching the existing *Record convention). Non-behavioral; flagged for regression.
- **STORY-70** flags the create-session response shape (full record vs REQ-24's {id,siteId,createdAt} sketch) and the unspecified section-not-found behavior (code returns full body; AC-809 documents the fallback).
- **STORY-46 / AC-816** documents the NET-LANDED single auto-managed session with NO session-list/new-chat/title-edit/delete UI. The session-management UI was added in 46109cd then deliberately removed in the 7e91942 second pass per operator feedback; documenting the net state is faithful to operator intent, not silent divergence absorption.
- **STORY-38** records the @gendev scope rename while keeping product slug 1stcontact, the four seeded skeletons, ui-kit removal, and the pre-existing control-app TS DOM-type build failure (present on baseline, neither introduced nor fixed by the rename).

## Plan Item Accounting

| Plan Item | Expected Story | Status |
|-----------|---------------|--------|
| 1. Chat & reference-doc persistence schema (D1) — feature | story-1e174b7c (STORY-69, new) | OK — 7 ACs (793-799) |
| 2. Chat session & reference-doc HTTP API — feature | story-721e8feb (STORY-70, new) | OK — 11 ACs (800-810) |
| 3. Chat handler: server-resident history + tail-prime + memory tools — upgrade (server axis) | story-ba9f2715 (STORY-46) | OK — AC-486 modified + AC-811-814 added |
| 4. Builder UI durable sessions + infinite scroll + fetch binding (BUG-8) — upgrade (client axis) | story-ba9f2715 (STORY-46) | OK — AC-585 modified + AC-815-818 added |
| 5. @gendev scope + productization skeletons — upgrade | story-067dc2f8 (STORY-38) | OK — AC-819-821 added |

All 5 plan items produced output. Items 3 and 4 target STORY-46 on disjoint axes (server: AC-486; client: AC-585) and compose additively — both landed.

## Evidence Sufficiency (Step 5b)

Every active AC introduced or modified by this bundle has a passing UAT that enters through a real user-relevant interface, mocks only external boundaries, and asserts observable outcomes that a broken implementation would fail. All 32 bundle UATs were executed and pass (18 schema/API + 14 STORY-46/38).

- **Schema (AC-793-799)** — `test_reconciliation_chat_reference_schema.test.ts` runs against a real Miniflare D1 with the actual migration SQL applied (up + reverse-order down), exercising real FTS5 triggers, cascade deletes, and ordinal uniqueness. Behavioral, not source inspection.
- **API (AC-800-810)** — `test_reconciliation_chat_reference_api.test.ts` drives the real `handleChatRoute` HTTP entry against a migrated isolated Miniflare D1; only R2 (blob storage, an external boundary) is faked. Atomic-append, pagination, cascade+sweep, section slicing all asserted on observable responses.
- **Chat handler (AC-486, 811-814)** — call the real `handleChatRequest`; only the upstream Anthropic fetch is stubbed (external boundary). Memory-tool site-scoping (AC-813) asserts cross-site sessions are reported not-found and that memory calls emit no FE SSE — a broken/unscoped implementation would fail.
- **Builder UI (AC-585, 815-818)** — drive the real `bootBuilder`/store/session client. AC-818 installs a spec-enforcing fetch that throws unless `this===globalThis` and exercises every default-fetch path, distinguishing the bound (fixed) from unbound (broken) implementation.
- **Rename (AC-819-821)** — AC-819 greps the full apps/packages/tools tree for any surviving `@1stcontact/` specifier (a stale import fails the test); AC-821 actually runs `tsc` for both Workers and `runGenerate` for the site, asserting public-site builds clean + non-empty output and control-app's pre-existing failure persists. Behavioral build-parity backs the structural manifest check.

## Judgment Calls

- **AC-819 manifest/import inspection — accepted.** For a purely mechanical npm-scope rename the deliverable IS the manifest/import text, so a source scan is the appropriate (and only possible) evidence for "no @1stcontact specifier survives"; it is not a "which function is wired" invariant. Build-neutrality is separately proven behaviorally by AC-821 (real tsc + generate). The pair is sufficient.
- **FTS token-quoting safeguard — omitted as non-material.** Subsumed by the FTS search ACs; a developer would not be surprised.
- **REQ-25 intermediate multi-session UI — correctly excluded.** No ACs document the dropped session-list/new-chat/title-edit/delete affordances; AC-816 documents the net-landed auto-managed single session. This matches operator intent (the affordances were removed deliberately).

## Verdict

PASS: Stories accurately and completely document the behavior surface of BUNDLE-9 and faithfully represent the operator's intent across REQ-23/24/25/50 and BUG-8. All five plan items produced stories; intent/code divergences are explicitly flagged rather than silently absorbed; no story claims invented behavior; and every active AC introduced or modified by this bundle is backed by a passing UAT that traverses a real entry point with only external boundaries faked and cannot be satisfied by a broken implementation. A developer reading these stories would have a correct mental model of what this code does and what the operator set out to build.
