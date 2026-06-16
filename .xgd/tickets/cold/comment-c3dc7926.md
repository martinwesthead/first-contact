---
uid: comment-c3dc7926
id: COMMENT-11
type: comment
title: Comment on request REQ-11
created_by: xgd
created_at: '2026-06-15T22:45:30.822874+00:00'
updated_at: '2026-06-15T22:45:30.925816+00:00'
completed_at: null
last_field_updated: body
status: null
fields:
  subject_uid: request-8ff05044
  kind: chat_transcript
---

<!-- xgd-cli-session ts="2026-06-15T22:45:27Z" model="claude-opus-4-7" continued_from="new" -->
*Captured by CLI Claude — paraphrased reconstruction from session memory, not raw capture.*

<!-- xgd-chat role="user" ts="2026-06-13T17:00:00.000Z" -->
#### You
[Earlier context: discussing site builder. User raised:] website staging vs publishing - user has to be able to make these changes, see the results and THEN publish - this feature would be disabled in trial for example

<!-- xgd-chat role="assistant" ts="2026-06-13T17:00:00.000Z" -->
#### Claude
**Publish action semantics:**
1. Validator pass on draft (defense in depth — Layer 3 per DOC-7 §6.5)
2. Copy draft → published + write revision snapshot
3. Trigger `tools/generate` to rebuild static output from published
4. Deploy to public URL

**Trial gating:** Publish button disabled / upsell-styled for trial plans. Trial users edit and preview freely; nothing reaches public URL.

**Leans confirmed:**
- Trial users get any public URL: None
- Revision granularity: Per-publish (not per-save) — saves cheap and frequent; publishes deliberate decisions worth preserving
- Rollback: Yes — separate "revert published" action; draft untouched
- Autosave to D1: Debounced per-tool-call, not per-keystroke
- Concurrent publish during AI turn: Snapshot draft at publish-click; AI's in-flight changes apply to new draft (no race)

<!-- xgd-chat role="user" ts="2026-06-13T19:00:00.000Z" -->
#### You
The draft publish ideas are good. Lets talk about the UX?

<!-- xgd-chat role="assistant" ts="2026-06-13T19:00:00.000Z" -->
#### Claude
Lifecycle leans locked. The publish action thus has these guarantees that must hold:

- Snapshot at handler-entry — AI's mid-turn edits land in the new draft, not in the just-published revision
- Defensive validator at publish — Layer 3 from DOC-7 §6.5 (could catch framework-version drift in stored definitions)
- Revision row written before sites.published_definition swap — never lose history even on build failure
- Build triggered after D1 commit — observable from action:notify

<!-- xgd-chat role="user" ts="2026-06-15T13:00:00.000Z" -->
#### You
[Operator API discussion in same session — user request:] One important detail - the AI needs to be able to do everything - change the site settings, name, even publish the site, roll back.

<!-- xgd-chat role="assistant" ts="2026-06-15T13:00:00.000Z" -->
#### Claude
Publish, rollback, and list_revisions are **Category 2 system actions** under the Operator API:
- AI tool call → Anthropic tool-use → Worker matches against OPERATOR_ACTIONS → executes with side effects (D1 writes, revision snapshots, build triggers) → emits action:notify back to FE.
- Plan-tier gated at the OPERATOR_ACTIONS registry level — trial sessions never see publish/rollback tools in their tool list.
- UI affordances (publish button, revisions panel, rollback action) consume the same endpoints via REQ-12.

<!-- xgd-chat role="user" ts="2026-06-15T14:30:00.000Z" -->
#### You
ok can you create new REQ tickets for where we are?

<!-- xgd-chat role="assistant" ts="2026-06-15T14:30:00.000Z" -->
#### Claude
Created REQ-11 — Site lifecycle API: publish_site, rollback_to_revision, list_revisions.

Story points 3. Depends on REQ-9 (Operator API foundation), REQ-10 (schema), REQ-6 (tools/generate). Magic-link auth recommended prerequisite; ships with trial-plan stub from REQ-9 otherwise.

Key semantics:
- publish_site: snapshot-at-entry, validator-passes, revision-write-before-swap, build-after-commit
- rollback_to_revision: updates published only; draft untouched (per CHAT-9 lean)
- list_revisions: metadata-only response; separate get_revision action later if needed
- Inline subrequest for build trigger in v1 (5–30s envelope); migrate to queues if it becomes user-painful

All three actions registered in OPERATOR_ACTIONS with `plan_tier: 'paid'` and ui_route pointing at REQ-12's affordances.

<!-- xgd-chat-end -->