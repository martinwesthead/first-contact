---
uid: report-9513ab74
id: REPORT-652
type: report
title: 'Capability-Intent Alignment: Lead Capture & CRM Lite (level=story)'
created_by: xgd
created_at: '2026-06-28T19:14:56.904273+00:00'
updated_at: '2026-06-28T19:14:56.904273+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: capability_validation
  subject_uid: capability-79556c4b
  level: story
  violations: 0
  warnings: 0
  needs_review_count: 0
---

# Capability-Intent Alignment: Lead Capture & CRM Lite
# Level: story

**Result**: PASS
**Violations**: 0
**Warnings**: 0
**Needs review**: 0

## Cumulative Intent Considered

The capability (CAP-37) was created by `xgd` with no `intent_uid`/`updated_by` on the
capability frontmatter. Its single story (STORY-45) carries `intent_uid=bundle-94e1d1b6`
and no `updated_by` chain — exactly one intent has ever touched this capability tree.

| Intent ID | Status | When (merged_at_commit) | Asked / changed | Counts? |
|---|---|---|---|---|
| BUNDLE-2 (bundle-94e1d1b6) → REQ-7 | free_and_reconciled | 8ebe122e | Lead-capture pipeline: D1 `leads` schema + indexes; `POST /api/forms/contact` real handler (content-type/JSON validation, honeypot silent-drop, email required+RFC, Turnstile verify, CF-IPCountry, INSERT status=`new`, lead_id response, error-code set); best-effort Resend notification (failure non-fatal); `extra_fields` JSON for non-canonical fields; Turnstile script/meta injection in contact-form module; client-island token attachment | YES |

Notes on the bundle: BUNDLE-2 bundles REQ-1..REQ-8. Only **REQ-7** ("Lead-capture
pipeline") maps to this capability. REQ-5 ("Framework: content modules ... contact-form")
contributes the *static* contact-form structure (fields, honeypot input, Turnstile mount)
but that surface is owned by the Framework Module Catalog capability (CAP-34), per both the
CAP-37 body and REQ-7's own out-of-scope list — correctly excluded here. No abandoned/
deprecated/wont_fix intents touch this capability, so nothing must be retired.

## Alignment Ledger

| Element | Intents aligned to | Outcome |
|---|---|---|
| CAP-37 (capability body) | REQ-7 (BUNDLE-2) | aligned — body scopes runtime lead-capture + data contract to this capability and explicitly defers CRM Lite UI to future; matches REQ-7's "Explicitly NOT in this ticket" |
| STORY-45 (feature) | REQ-7 (BUNDLE-2) | aligned — body comprehensively reflects REQ-7's deliverables, in-scope and out-of-scope sets, and error-code contract; documented divergences are implementation details that do not contradict intent |

## Findings

| # | Severity | Property | Element | Resolution category | Issue | Suggested edit |
|---|---|---|---|---|---|---|
| 1 | info | consistency | STORY-45 | — | Lead id divergence: REQ-7 specifies ULID ("Generate ULID"); implementation uses `crypto.randomUUID()`. Story body Technical Context discloses this as an internal divergence — the id is opaque to callers and the assertion is only that the response carries a non-empty `lead_id` matching the row PK. No behavioral drift. | none |
| 2 | info | consistency | STORY-45 | — | Turnstile gating: REQ-7 describes Turnstile verification as part of the happy path; the implementation gates verification on `TURNSTILE_SECRET` being configured and persists without a token when the secret is absent (local-dev affordance). Story body documents this explicitly; the *failure* path (secret present, verification fails → 400, no DB write, no Resend) matches intent. Additive robustness path; intent silent on secret-absent dev mode but does not prohibit it. | none |
| 3 | info | consistency | STORY-45 | — | Honeypot response includes `dropped: true`. REQ-7 requires the honeypot path to be success-shaped with no DB row / no email; the extra field is an implementation detail the story flags as "not in conflict with" the spec. The drop behavior itself (no row, no Resend, 200) matches intent. | none |
| 4 | info | coverage | CAP-37 | — | Capability body references future CRM Lite UI (lead inbox, status transitions, follow-ups, conversation log, quotes, invoices) with no story covering them. This is correct: REQ-7 explicitly defers all of these ("Explicitly NOT in this ticket"); no reconciled/imminent intent calls for them yet. Not a coverage gap. | none |

## Notes for the Editor

- This capability is at the simplest possible alignment shape: one reconciled intent (REQ-7
  inside the free_and_reconciled BUNDLE-2) and one feature story (STORY-45) that documents it
  end-to-end. No exclusivity surface (single story), no retired behavior to scrub.
- STORY-45 is unusually disciplined about disclosing implementation-vs-spec divergences in its
  Technical Context section (ULID→UUID, Turnstile secret gating, `dropped:true`, `name`
  optional, ASSETS binding ownership). All such notes were checked against REQ-7 and none
  introduce behavior the intent contradicts — they are honest implementation annotations, not
  drift. They are recorded above as `info` so a future check has the provenance.
- The capability/story boundary with CAP-34 (Framework Module Catalog) is clean: the static
  contact-form module structure (REQ-5) sits in CAP-34; the runtime token-verification,
  persistence, notification, script-injection, and client-side token-attach behavior (REQ-7)
  sits here. No double-counting between capabilities.
- STORY-45 status is `reconciling` (imminent per the status table). Its single source intent
  BUNDLE-2 is already `free_and_reconciled`, so there is no pending-but-unenforced intent risk.
