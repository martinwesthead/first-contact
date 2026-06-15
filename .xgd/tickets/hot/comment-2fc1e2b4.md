---
uid: comment-2fc1e2b4
id: COMMENT-9
type: comment
title: Comment on request REQ-9
created_by: xgd
created_at: '2026-06-15T22:45:21.164605+00:00'
updated_at: '2026-06-15T22:45:23.026683+00:00'
completed_at: null
last_field_updated: body
status: null
fields:
  subject_uid: request-68bfdf1e
  kind: chat_transcript
---

<!-- xgd-cli-session ts="2026-06-15T22:45:18Z" model="claude-opus-4-7" continued_from="new" -->
*Captured by CLI Claude — paraphrased reconstruction from session memory, not raw capture.*

<!-- xgd-chat role="user" ts="2026-06-15T13:00:00.000Z" -->
#### You
One important detail - the AI needs to be able to do everything - change the site settings, name, even publish the site, roll back. So we need an architectural principle that we create an API (or a CLI?) that the AI can use. I would like to have explicit tickets for this API so that it is captured in the Capability matrix as an explicit specification-surface.

Can we discuss that mechanism? I think that we already need a streaming push to the browser to support the chat content. Can we add a control channel that allows the AI to push commands to the FE?

<!-- xgd-chat role="assistant" ts="2026-06-15T13:00:00.000Z" -->
#### Claude
**The principle, said cleanly:** The AI's capabilities and the operator's UI capabilities must be the same set of actions, exposed through the same API. The UI is one consumer; the AI is another. Neither is privileged.

Name: **Operator API**. Single namespace on `app.1stcontact.io` — same auth, same authorization scope. AI cannot do anything the operator cannot do; operator can do everything the AI can.

**Channel mechanism:** Single SSE channel per chat session, multiplexed events:
- `chat:append` — assistant message tokens
- `state:diff` — site-definition tool calls (the §5.1 list)
- `action:notify` — system-action results (publish complete, rollback, rename)
- `validation:error` — tool call rejected; visible to operator + AI self-correction loop
- `state:invalidate` — server-side state changed; FE refetches

One stream, one connection. Client-side dispatcher routes events.

**Two categories of AI tool:**
1. **State edits** (already in REQ-8/DOC-8 §5.1) — modify in-memory site-definition. AI emits → forward as `state:diff` → FE validates locally + applies → eventual save.
2. **System actions** (new) — publish_site, rollback_to_revision, rename_site_slug, etc. AI emits → server executes against D1 / triggers builds → `action:notify` to FE.

Validator from REQ-3 covers Category 1. Category 2 needs its own authorization checks (plan tier, confirmation, slug-collision).

**Where this lives:** DOC-5 (the principle + channel architecture), DOC-8 (small update — tool surface IS the Operator API), CLAUDE.md (the parity invariant).

**REQ shape:** explicit API REQs in their own right:
1. REQ-API-FOUNDATION — channel + tool-execution framework + auth scope + event registry
2. REQ-API-LIFECYCLE — publish, rollback, revisions
3. REQ-API-SETTINGS — rename, display name, custom domain
4. REQ-API-ACCOUNT — create site, delete site, plan changes

Paired with UI REQs that consume them.

**Calls to confirm:** SSE vs WebSocket? Literal CLI alongside? Capability-matrix wording in CLAUDE.md? Tool authorization model — block at tool list or block at handler?

<!-- xgd-chat role="user" ts="2026-06-15T13:30:00.000Z" -->
#### You
I'd like to follow the architecture that we chose for XGD unless there are good reasons to do otherwise. So SSE...
2. not yet 3. Confirm. Plus I would like us to have explicit API tickets that's just to build the API and the specify the API control surface explicitly. I am hoping (and curious to see) if this triggers stories and capabilities explicitly around the API surface itself.
4. If the operator can't do it via UI, the AI shouldn't see it either.

<!-- xgd-chat role="assistant" ts="2026-06-15T13:30:00.000Z" -->
#### Claude
Confirmed on all four. SSE matches XGD (they already have `xgd_source/dashboard/sse.py`).

**API as first-class specification layer means REQ shape splits:**

Layer 1 — API REQs: REQ-API-FOUNDATION (channel, tool-execution framework, auth scope, event registry), REQ-API-STATE-EDITS (the §5.1 endpoints), REQ-API-LIFECYCLE (publish, rollback, revisions), REQ-API-SETTINGS (rename, etc.), REQ-API-ACCOUNT (multi-site, plan changes).

Layer 2 — UI REQs: REQ-UI-BUILDER (REQ-8 reshaped), REQ-UI-LIFECYCLE (publish button + revisions panel), REQ-UI-SETTINGS.

**Expected matrix behaviour:** API REQs produce endpoint-shaped ACs/capabilities ("POST /api/operator/publish_site rejects trial-plan tokens with 403"). UI REQs produce interaction-shaped ACs ("Publish button disabled with upsell tooltip on trial"). After reconciliation, both layers visible as distinct stories; API + UI pairing visible as parity check.

**Tool authorization (call #4):** Filter tool list by plan tier — if operator can't, AI never sees the tool. Cleaner principle; AI never "tries" something forbidden; defense-in-depth handler check remains.

<!-- xgd-chat role="user" ts="2026-06-15T13:55:00.000Z" -->
#### You
REQ-8 has been implemented why do you need to change it? I think at this point you create a new REQ with the changed

<!-- xgd-chat role="assistant" ts="2026-06-15T13:55:00.000Z" -->
#### Claude
Confirmed REQ-8 is ready_to_reconcile with commit SHA. Stays as-is.

New REQs only for new scope going forward. REQ-8's chat_transcript already captures the design that produced it (chat-on-left, iframe, state-edit tool surface). The Operator API principle is a *subsequent* decision — new REQs + DOC amendments going forward, not a rewrite.

**This REQ (Operator API Foundation):** establishes `/api/operator/*` namespace; extends SSE channel with action:notify, validation:error, state:invalidate event types; system-action execution framework on the Worker; plan-tier authorization middleware; tool-list filtering by plan tier; parity invariant scaffolding (each registered action carries `tool_spec` + `ui_route`).

**Grandfathered from REQ-8:** state-edit tools stay as inline tool execution behind `/api/chat`. Don't formalize them as separate `/api/operator/*` endpoints until a second consumer needs them.

**Out of scope here:** lifecycle endpoints (REQ-11), D1 schema (REQ-10), UI consumers (REQ-12), magic-link auth (separate REQ — until it lands, this REQ stubs trial-plan from the auth boundary).

<!-- xgd-chat role="user" ts="2026-06-15T14:30:00.000Z" -->
#### You
ok can you create new REQ tickets for where we are?

<!-- xgd-chat role="assistant" ts="2026-06-15T14:30:00.000Z" -->
#### Claude
Created REQ-9 — Operator API foundation: /api/operator namespace + SSE event registry + system-action framework + plan-tier authorization.

Scope per discussion above. Story points 4. Depends on REQ-8 (existing channel + state-edit baseline). Recommends magic-link auth REQ as prerequisite but ships with trial-plan stub if auth not yet landed.

Key deliverables: OPERATOR_ACTIONS registry as single source of truth; SSE multiplexes the full event-type set; system-action execution framework dispatches via registry; plan-tier middleware filters tool list AND defensively rechecks in handlers; tools/parity-audit.ts scaffolds the parity invariant for future CI matrix audits.

Parity principle recorded in REQ body for the matrix to surface as an architectural commitment.

<!-- xgd-chat-end -->