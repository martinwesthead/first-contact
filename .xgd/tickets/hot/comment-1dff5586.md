---
uid: comment-1dff5586
id: COMMENT-227
type: comment
title: Claude response for uat_coverage_check report
created_by: xgd
created_at: '2026-06-28T20:09:32.752175+00:00'
updated_at: '2026-06-28T20:09:32.752175+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  subject_uid: report-84ed21a6
  kind: note
---

Assessment complete. Report **REPORT-671** (report-84ed21a6) created with result **FAIL**.

## Summary — UAT Coverage: Public Site Delivery (CAP-36)

**Result: FAIL** — 1 violation, 0 warnings, 0 needs_review

**Intent grounding:** One story (STORY-44), one intent — BUNDLE-2 (REQ-1..REQ-8, `free_and_reconciled`). Nothing retired; every AC and the story body are supported. The story body is **aligned** (no stale claims), so this is a pure coverage gap, not drift.

**Verdicts written:**
- **9 ACs pass** — substantive, real entry points throughout:
  - AC-456/457: real `site.json` + real `validateSite` (module order, nav, typography, palette)
  - AC-458/459/616: real Worker via `unstable_dev` against a freshly generated bundle (GET 200, theme.css tokens, HEAD 200)
  - AC-461: real package scripts *and* an actual `runGenerate` into a temp dir
  - AC-462/463: real `ci.yml`/`deploy.yml` parsed for generate-step ordering (config ordering *is* the behavior)
  - AC-615: real `wrangler.toml`, both `[assets]` blocks
- **AC-460 fail → uat-edit** (the single violation)
- **STORY-44 fail** and **CAP-36 fail** (worst-case aggregate), both driven by the same gap

**The finding:** AC-460 requires a 404 carrying a `text/plain` content type, and its verification spec mandates asserting `Content-Type` begins with `text/plain`. Both the AC-460 test and the legacy REQ-6 test assert *status only*. The worker's one custom marketing-path behavior is synthesizing the `text/plain` 404 — a status-only test passes even if that synthesis were removed and the raw `ASSETS` 404 returned, so it can't distinguish a correct implementation from an incorrect one on the AC's defining dimension.

**Fix is one line** on the existing test (`expect(resp.headers.get("content-type")).toMatch(/^text\/plain/)`) — no new AC, test file, or story-body edit. That single edit clears both the AC-460 and STORY-44 verdicts.
