---
uid: request-638ea280
id: REQ-35
type: request
title: 'Convert flow: remove destructive-confirmation gate (defer copyright/robots
  concerns)'
created_by: xgd
created_at: '2026-06-20T18:25:57.452443+00:00'
updated_at: '2026-06-20T18:25:57.452443+00:00'
completed_at: null
last_field_updated: created_at
status: draft
fields:
  priority: high
  story_points: 1
  auto_merge_back: true
  needs_review: false
---

## What is the user-visible change?

Remove the destructive-confirmation gate from the convert flow. After this REQ, when the operator (or AI) invokes `transcribe_site(digestId)`:

- No `ConvertConfirmation` chat-card is shown.
- No "I own this site" checkbox is presented.
- No `convertConfirmed[chatId]` flag is checked.
- The action proceeds immediately to the mirror / digest / AI-reconstruction phases.

The operator just types "convert this URL" (or the equivalent) and the convert runs.

## Why this matters now

The safety protocol introduced by [[REQ-28]] AC1-2 (`ConvertConfirmation` card + flag + `requires_confirmation` gate) has three problems in practice:

1. **It's broken.** [[BUG-4]] documents that the Confirm button's click dispatches an event with no listener, and `registerConvertConfirmation()` is never called in `bootBuilder`. The card doesn't actually gate anything reliably — the operator types a confirmation in chat to work around it.
2. **It's the wrong UX shape.** A confirmation modal on every convert attempt is friction in a flow where the user is iterating dozens of times. The risk it was protecting against (accidental destructive overwrite of the operator's draft) is better addressed by the Reset button ([[REQ-31]]) plus the clear-on-import behaviour ([[REQ-XX-clear-on-import]]) — the operator can always recover.
3. **The copyright / robots concern it was conflating** (the "I own this site" checkbox folded a robots-override into the confirmation) is a real concern but deserves its own UX, not a piggyback on a destructive-action modal. We will come back to it as a separate ticket once the more fundamental convert-flow issues are settled.

For testing iteration on the convert flow, this gate is the single biggest friction point. Removing it unblocks the testing cycle.

## Why free-coded

Pure deletion of a feature plus a one-line behaviour change in the action handler. No new design, no tests for new behaviour — the tests being removed are tests for the removed code.

## Decisions

- **Remove, don't disable.** No "feature flag" or "behind a config toggle." Delete the gate code; delete the `ConvertConfirmation` component; delete the `requires_confirmation` return path. If we add a copyright/robots gate back in a future ticket, it will be a fresh shape designed for that concern alone.
- **The "I own this site" checkbox and its robots-override registration are dropped along with the rest.** The underlying robots-override mechanism in [[REQ-20]] stays — there's just no path through the convert flow that sets it. A separate operator action for per-origin robots overrides can come back later.
- **[[BUG-4]] is superseded.** Its scope (fix the broken click wiring) becomes moot. Close it out as obsoleted by this REQ.
- **The `ConvertConfirmation` test fixtures and UATs are removed.** Code that doesn't exist doesn't need tests.

## IN

### `apps/control-app/src/operator/transcribe-site.ts`

- Remove the `convertConfirmed[chatId]` check.
- Remove the `requires_confirmation` early-return / typed-error path.
- Remove the call to `mintConfirmationCard` (or whatever surfaces the chat-card).

### `apps/control-app/src/operator/chat-metadata.ts`

- Delete `convertConfirmed[chatId]` storage entirely.
- Delete the matching `confirm_convert` operator action that mutates it (registry.ts entry + handler).
- Keep `robotsOverrides[origin]` storage — used by the underlying safety contract in [[REQ-20]], unrelated to the convert UX.

### `apps/control-app/src/operator/registry.ts`

- Remove `confirm_convert` from `OPERATOR_ACTIONS`.

### `packages/builder-ui/src/components/convert-confirmation.ts`

- Delete the file.
- Delete its export from `packages/builder-ui/src/index.ts`.

### `packages/builder-ui/src/main.ts`

- Remove any references to `registerConvertConfirmation` / `createConvertConfirmationRenderer` (currently broken-and-unused per BUG-4, but tidy up the import / boot wiring regardless).

### Tests

Remove:
- `tests/test_UAT_FC_REQ-28_transcribe_site_requires_confirmation*.test.ts` (whatever name(s) exist).
- `tests/test_UAT_FC_REQ-28_convert_confirmation_card*.test.ts`.
- Any other test referencing `convertConfirmed`, `requires_confirmation`, or `<ConvertConfirmation>`.

Add (minimal coverage of the new "no-gate" behaviour):

- `tests/test_UAT_FC_REQ-XX_transcribe_site_runs_without_confirmation.test.ts`: invoke `transcribe_site(digestId)` against a fixture, assert it proceeds straight to Stage 1 (mirror) without returning `requires_confirmation` and without surfacing a chat-card.

## OUT

- A replacement copyright / robots UX. Deferred — explicit follow-up ticket when we return to it.
- Removal of the underlying `robotsOverrides` storage. The safety contract still uses it; we only remove the convert-flow path that wrote to it.
- The `<TranscribeProgress>` chat-card. Keep it — operators still need to see convert progress; only the confirmation card goes.
- Any change to the destructive-overwrite question for already-populated drafts. [[REQ-XX-clear-on-import]] addresses that by clearing before convert.

## Dependencies

- [[REQ-28]] — sourced the confirmation gate this REQ removes.
- [[REQ-30]] — convert-flow rework that this REQ further simplifies.
- [[REQ-31]] — Reset button provides the manual-rollback affordance that replaces the confirmation as the safety net.
- [[BUG-4]] — explicitly superseded.

## Acceptance criteria

1. `transcribe_site(digestId)` returns no `requires_confirmation` error under any starting condition. Tested by invocation against the killer-demo fixture and via direct unit-test of the action handler.
2. No `<ConvertConfirmation>` chat-card is rendered anywhere in the builder. The dispatcher doesn't have a renderer registered for `kind: "convert_confirmation"`.
3. No `convertConfirmed` field exists in chat metadata. Grep for `convertConfirmed` across the repo returns zero matches in production code.
4. `confirm_convert` operator action is not registered. `xgd quality run --tests` plus the operator-actions test pass (which enumerates the registry) reports the removal.
5. The previously-existing REQ-28 confirmation UATs are removed (the behaviour they exercised no longer exists).
6. A new UAT verifies `transcribe_site` runs successfully on first invocation against the killer-demo fixture without any prior confirmation flag being set.
7. [[BUG-4]] is closed out as superseded — its body updated with a pointer to this REQ.

## Story points

1. Pure deletion + one UAT for the no-gate path + closing BUG-4. Genuinely a one-line behaviour change at the handler boundary plus surrounding cleanup.

## Notes for reconcile

- This REQ deletes scope that was added by REQ-28. The capability matrix will need to walk back those ACs. The simplest way for the reconciler is to mark REQ-28 ACs 1, 2, and 14 (the "I own this site" checkbox AC) as superseded by this REQ.
- The robots-override mechanism remains in REQ-20's surface — only the convert-flow access path is removed. If the operator has set robots overrides via REQ-20's primary mechanism, those persist.
- The future copyright/robots ticket will likely want a dedicated chat-card type (e.g. `<RobotsOverridePrompt>`) shown when the underlying safety contract blocks a fetch — distinct from a "you are about to destroy your draft" confirmation.
