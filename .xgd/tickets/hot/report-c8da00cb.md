---
uid: report-c8da00cb
id: REPORT-504
type: report
title: Claude reconciliation_story_generation report
created_by: xgd
created_at: '2026-06-25T01:48:43.625497+00:00'
updated_at: '2026-06-25T01:48:43.625497+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: reconciliation_story_generation
  subject_uid: bundle-94e1d1b6
  plan_item_index: '8'
---

All 13 ACs created and linked. Done.

```
Story #8 created for reconciliation bundle-94e1d1b6

Story UID: story-37572647 (STORY-45)
Title: Public contact-form submissions are captured as leads with spam protection and best-effort owner notification
Type: feature
Capability: CAP-37 (capability-79556c4b) — Lead Capture & CRM Lite (newly created; no prior capability covered lead intake)
Acceptance Criteria: 13 created (AC-464 through AC-476)

Progress: 8 of 9 plan items complete
```

Coverage summary of the 13 ACs:
- AC-464: `leads` table schema + CRM Lite status enum + indexes
- AC-465: happy-path POST → 200 + lead_id + row inserted with expected columns
- AC-466: honeypot drop returns 200 with no DB row, no notification
- AC-467: INVALID_CONTENT_TYPE
- AC-468: INVALID_JSON
- AC-469: MISSING_FIELD (no email)
- AC-470: INVALID_EMAIL (malformed)
- AC-471: TURNSTILE_FAILED (token absent or siteverify false) — no DB, no notification
- AC-472: `ip_country` populated from `CF-IPCountry` header
- AC-473: non-canonical fields preserved in `extra_fields` JSON
- AC-474: best-effort notification — provider failure does not fail the request
- AC-475: generator injects Turnstile script + site-key meta only when a contact-form is present AND a site key is configured
- AC-476: client island attaches `turnstile_token` to JSON body when a widget is rendered

Two intent-vs-code divergences flagged in the story's Technical Context for regression visibility:
1. Lead id format: intent says ULID; code uses `crypto.randomUUID()`. AC asserts only opacity + non-empty.
2. Honeypot response body includes `dropped: true` (an implementation extra). AC asserts only the success-shaped 200 + no side effects, matching the spec's intent.
