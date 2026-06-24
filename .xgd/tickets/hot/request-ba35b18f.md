---
uid: request-ba35b18f
id: REQ-52
type: request
title: Relax analyze_page operator-intent gate so the tool is usable without per-call
  URL re-pasting
created_by: xgd
created_at: '2026-06-24T23:21:54.657365+00:00'
updated_at: '2026-06-24T23:21:54.657365+00:00'
completed_at: null
last_field_updated: created_at
status: draft
fields:
  priority: medium
  auto_merge_back: true
  needs_review: false
---

## Problem

`analyze_page` rejects every operator-triggered call with `operator intent required: paste a URL in chat (or pass a fresh intentToken) before calling analyze_page` unless one of these is true in the same turn:

- the operator's most recent message contained a URL or a `fetch`/`analyze`/`render`-shaped keyword (`operatorMessageImpliesIntent`), OR
- a fresh signed intent token was minted by `/api/chat` and passed through.

Surfaced 2026-06-24 dogfooding while testing [[REQ-51]]:

> "I don't understand why it was designed that way I did not ask for any site budget and I need it removed so that I can test it!"
> — operator, 2026-06-24

The gate is blocking the operator from invoking analyze_page through normal conversational means — the AI itself can call the tool from a multi-turn plan, but each call has to re-prove operator intent or it's rejected. In practice this means the operator has to keep re-pasting the URL or use very specific phrasing to keep the AI's tool calls flowing.

## Origin / safety context

The intent gate was added in [[REQ-20]] as a safety contract: prevent the AI from autonomously fetching arbitrary URLs without the operator explicitly asking for it. The threat model includes:

- AI hallucinating URLs and probing private/internal endpoints.
- Operator-pasted prompt-injection chains directing the AI to fetch attacker-chosen URLs.
- Per-account abuse / cost runaway via unintended fetches.

Plain removal of the gate forfeits these protections. The fix needs to preserve the safety intent while removing the everyday friction.

## Scope (TBD — operator chooses)

Pick one (or propose a different shape):

### Option A — turn-scoped intent (relaxed gate)

Once the operator's message in this turn includes ANY of:
- a URL
- the keywords already covered by `operatorMessageImpliesIntent`
- a soft trigger like "yes", "do it", "go ahead" when the immediately prior assistant turn proposed an analyze_page call,

allow ALL analyze_page calls THIS TURN to proceed without per-call re-proof. Today the gate is per-call.

Net effect for the operator: paste a URL once, AI can call analyze_page multiple times in the same response.

### Option B — session-scoped trust (explicit unlock)

Add a per-session "allow web fetches" toggle the operator flips once. While on, analyze_page bypasses the intent gate for the remainder of the session. Off by default. Persisted on the session row. Easy to expose as a "Enable web research" switch in the builder UI.

Preserves the original safety intent: the operator must consciously opt in, but doesn't have to keep re-proving consent every turn.

### Option C — kill the gate entirely

Remove `checkOperatorIntent` from `analyze-page.ts`. Lean on the rest of the REQ-20 safety stack (robots.txt, rate limit, SSRF block, content-type cap, byte cap) and the per-session browser budget. Simplest; weakest defense against the threat model above.

### OUT (deferred regardless of option)

- Per-domain allowlists / blocklists (operator-managed allowed origins).
- Intent gate for OTHER fetching tools (`transcribe_site`, future `preview_external_url`, etc.) — this REQ scopes to analyze_page only.

## Dependencies

- [[REQ-20]] — owns `operatorMessageImpliesIntent`, `mintIntentToken`, `verifyIntentToken`, and the chat-handler's intent-token wiring.
- [[REQ-21]] / [[REQ-22]] — analyze_page handler currently calls `checkOperatorIntent` directly.

## Acceptance criteria (will sharpen after option is chosen)

1. The chosen mechanism is documented in the analyze_page tool description so the AI knows when intent is "live".
2. Existing safety-failure UATs (REQ-21 / REQ-22) continue to pass — only the intent gate's trigger surface changes, not the rest of the safety stack.
3. New UAT covers the chosen happy-path: operator triggers an analyze_page flow that previously would have required re-proving intent, and the call succeeds without an `intentToken` round-trip.
4. If option B is picked: an additional UAT covers "session toggle off → first analyze_page call rejected exactly as it is today".

## Story points

TBD (3 for option A, 5 for option B with persisted session toggle, 1 for option C).
