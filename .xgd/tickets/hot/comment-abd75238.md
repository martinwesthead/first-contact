---
uid: comment-abd75238
id: COMMENT-5
type: comment
title: Comment on request REQ-7
created_by: xgd
created_at: '2026-06-12T23:30:43.808296+00:00'
updated_at: '2026-06-13T19:00:09.973427+00:00'
completed_at: null
last_field_updated: body
status: null
fields:
  subject_uid: request-dc524eaa
  kind: chat_transcript
---

*Captured from dashboard chat CHAT-7 (chat-9223ebdc) — paraphrased excerpts of the design discussion specifically relevant to this ticket. Full session transcript lives on CHAT-7.*

<!-- xgd-chat role="user" ts="2026-06-12T22:35:00.000Z" -->
#### You

Lets talk about those design decisions.

<!-- xgd-chat role="assistant" ts="2026-06-12T22:40:00.000Z" -->
#### Claude

**Lead-capture pipeline depth — three options:**

(a) Email-only — Worker forwards form submission to your inbox. Simplest.
(b) D1 lead record + email notification — leads accumulate in queryable form even before the CRM UI exists. Forces us to define the leads schema now, which we have to do anyway in Phase 1.
(c) Full CRM Lite — too much for Phase 0.

Recommendation: **(b)**. Email-only forces a retro-fit when CRM Lite arrives — we'd have unrecoverable lead history in your inbox. D1 from day one means leads accumulate centrally, operator reads email + occasional `wrangler d1 execute` queries until the CRM UI exists.

**Phase 0 pipeline:**

```
Form submit
  → POST /api/forms/contact on the public-site Worker
  → Turnstile verification
  → INSERT into leads (D1)
  → Email notification to operator via provider
  → Inline success message in the form module
```

**`leads` v1 schema (rough):**

```
id, site_id, form_id, created_at,
name, email, phone?, message,
page_path, status (default 'new'),
turnstile_verdict, ip_country
```

No admin UI in Phase 0 — for now you read leads via email + ad-hoc D1 queries. CRM Lite UI is a later REQ.

**Email provider:** Resend. Cleanest DX, Cloudflare-friendly. Mailchannels free tier ended; Postmark and SES work but more setup.

<!-- xgd-chat role="user" ts="2026-06-12T22:50:00.000Z" -->
#### You

That makes sense.

<!-- xgd-chat role="assistant" ts="2026-06-12T22:55:00.000Z" -->
#### Claude

Schema decisions for this REQ:

The `leads` table includes all columns the CRM Lite UI will need — `status` enum matching the DOC-4/DOC-5 lifecycle (`new | contacted | quote_needed | quote_sent | follow_up | booked | lost | archived`), `notes`, `extra_fields` JSON for non-canonical form fields, `ip_country` from `CF-IPCountry`, `turnstile_pass` for audit. Indexed by `(site_id, created_at DESC)` for list views and `(site_id, status)` for filter views. So we don't migrate the table again immediately when CRM Lite UI lands.

Handler ordering: parse + content-type check → honeypot check (drops silently — returns 200, no DB row, no email) → field validation → Turnstile verify (server-side via `https://challenges.cloudflare.com/turnstile/v0/siteverify`) → ULID generation → D1 INSERT → Resend POST. **Resend failure does NOT fail the request** — the lead is already persisted; Resend error is logged. This is deliberate: losing the email notification is recoverable (operator can re-query D1); losing the lead is not.

Site-id hardcoded to `1stcontact` in this REQ; per-site routing comes with customer site support.

Operator out-of-band tasks: `wrangler d1 create 1stcontact-prod`, apply migration, set up Turnstile site for `1stcontact.io`, Resend account + verified sending domain, `wrangler secret put` for `TURNSTILE_SECRET` and `RESEND_API_KEY`.

<!-- xgd-turn id="5a1fe94f-fa92-4eeb-a7dc-b770433ad1aa-user" -->

<!-- xgd-chat role="user" ts="2026-06-13T18:57:06.920Z" -->
#### You
Please free code this

<!-- xgd-chat-end -->