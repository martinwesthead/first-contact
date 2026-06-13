---
uid: comment-abd75238
id: COMMENT-5
type: comment
title: Comment on request REQ-7
created_by: xgd
created_at: '2026-06-12T23:30:43.808296+00:00'
updated_at: '2026-06-13T19:10:28.945319+00:00'
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

<!-- xgd-turn id="5a1fe94f-fa92-4eeb-a7dc-b770433ad1aa-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-13T19:10:28.917Z" -->
#### Claude
I have enough context. Let me start building. First, the migration:

Now the form handler. I'll factor it into a separate testable function:

Now the Turnstile widget loading. I'll update the contact-form module to load the Turnstile API script and the client to attach the token, and update the generator to emit the site-key meta tag.

Now I need to wire Turnstile script loading via the generator. Let me update the renderer:

Let me write the tests. First a helper that creates a Miniflare-backed D1 with the migration applied:

I need to add `miniflare` as a top-level devDep so tests can `import { Miniflare }`. It's already a transitive dep — just promoting it.

Miniflare D1 works. Now writing the UATs:

Migration UATs pass. Now the handler UATs:

Now the client-side Turnstile token UAT and generator UAT:

The REQ-6 form-stub tests are superseded by REQ-7's real-handler tests. Removing them:

Now let me run the full test suite to make sure nothing else broke:

Let me check if the parallel failure is from my new Miniflare subprocess churn:

All 112 tests passing reliably. The earlier failure was flake from parallel `unstable_dev` boot. Now let me check the build/lint:

All builds pass, type-check clean. Let me also run a quick wrangler dryrun to confirm the worker compiles:

Worker compiles, D1 binding registered. Now version bump, commit, ticket update.

Now I need to update the ticket body to reflect what's actually built — the prior body still describes the plan. Per the handoff rule, I'll append a "What landed" section while preserving the original scope content:

REQ-7 is complete and parked at `free_coded`.

**What landed in `fa41944`:**
- `db/migrations/0001_create_leads.sql` — leads schema (15 columns + 2 indexes), CRM Lite lifecycle states pre-baked
- `apps/public-site/src/forms.ts` — testable `handleContactSubmission(request, env, deps)` factored out: parse → honeypot → email validate → Turnstile verify → D1 INSERT → Resend best-effort. Resend failure does not fail the request.
- `apps/public-site/wrangler.toml` — `LEADS_DB` binding (top-level + production), vars, documented secrets
- Turnstile widget loading: generator emits `<meta>` + script tag (gated on `TURNSTILE_SITE_KEY` env at build time); client reads `window.turnstile.getResponse()` and attaches `turnstile_token`
- 14 REQ-7 UATs (all pass under parallel and serial); deleted 3 obsolete REQ-6 stub tests
- `miniflare ^3.20250718.3` promoted to a top-level devDep so the handler can be tested against a real in-process D1

**112/112 tests pass; build clean; `pnpm dryrun:public` succeeds.**

**Operator pre-deploy steps** are documented in the ticket body (D1 create + migration apply, Turnstile site setup, Resend account + domain verification, secrets `wrangler secret put`). Ticket is parked at `free_coded` — promote to `ready_to_reconcile` when ready.

<!-- xgd-chat-end -->