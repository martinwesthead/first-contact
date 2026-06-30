---
uid: acceptance_criterion-6cc4c22e
id: AC-565
type: acceptance_criterion
title: Browser-rendering session budget is infinite by default; finite cap only under
  config override
created_by: xgd
created_at: '2026-06-27T00:34:24.128887+00:00'
updated_at: '2026-06-30T06:33:47.333970+00:00'
completed_at: null
last_field_updated: title
status: pending
fields:
  story_uid: story-a0482aed
  kind: behavior
  regression_only: false
---

## Criterion

The DEFAULT per-chat-session browser-rendering budget is effectively infinite: `DEFAULT_BROWSER_BUDGET.sessionMaxSeconds` is `1e9` (one billion seconds), so a budget check or charge that supplies no `config` override never returns session exhaustion under any realistic accumulation of browser-seconds.

A finite per-chat-session cap is enforced only when an explicit `config` override supplies a smaller `sessionMaxSeconds`. When such an override is in effect, once the session counter reaches that cap, any subsequent budget check returns `{ok:false, reason:'budget_exhausted', exhausted:'session', remainingSeconds:0}` (the boundary is inclusive: spent >= cap triggers exhaustion). A check before exhaustion returns `{ok:true, remaining:{session,day}}`. The session budget is independent of the per-account-day budget.

## Verification

Default path: charge a large cumulative browser-seconds total (e.g. well above the old 50s ceiling) to a single session under an injected clock and a stub KV with NO `config` override; assert every check returns `ok:true`. Override path: pass `config: {sessionMaxSeconds: 50}` and charge until the session counter reaches 50; assert the next check returns `ok:false`, reason `budget_exhausted`, exhausted `session`, `remainingSeconds: 0`, while a check against a different session ID (same account) still returns `ok:true`.
