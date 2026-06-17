---
uid: request-8ff05044
id: REQ-11
type: request
title: 'Site lifecycle API: publish_site, rollback_to_revision, list_revisions'
created_by: xgd
created_at: '2026-06-15T22:42:27.775986+00:00'
updated_at: '2026-06-15T22:42:27.775986+00:00'
completed_at: null
last_field_updated: created_at
status: draft
fields:
  priority: medium
  story_points: 3
  auto_merge_back: true
  needs_review: false
---

## Scope

Implement the **site lifecycle actions** as Operator API endpoints: `publish_site`, `rollback_to_revision`, `list_revisions`. These are the first Category 2 (system action) entries in the `OPERATOR_ACTIONS` registry from [[REQ-9]], and the first endpoints in the platform that have side effects beyond the in-memory draft (D1 writes, revision snapshots, build triggers).

After this REQ: an authorized (paid-plan) operator — either via UI affordance (REQ-12) or via AI tool call — can publish the current draft, roll back to a prior revision, and view the revision history. Trial-plan operators see no publish/rollback tools and receive 403 on direct API calls.

Design discussion: Operator API parity + draft/publish lifecycle leans (per-publish revisions; rollback as separate "revert published" action; draft untouched by rollback; snapshot at publish-click for concurrency).

## Why free-coded

First non-trivial application of the Operator API foundation. Three closely-coupled endpoints with shared semantics (revisions, plan gating, build triggers). Single cohesive intent: enable the lifecycle.

## Dependencies

- [[REQ-9]] — Operator API foundation, `OPERATOR_ACTIONS` registry, plan-tier middleware, SSE event registry.
- [[REQ-10]] — D1 schema: `sites`, `revisions`, accounts/plan_tier.
- [[REQ-6]] — `tools/generate` invocable from the Worker context (for the publish build step).
- Magic-link auth — recommended prerequisite; if not landed, this REQ ships with the trial-plan stub from REQ-9 and the action handlers return 403 in all real sessions. UATs use a paid-plan test session via header override.

## Deliverables

### `publish_site` action

Registered in `OPERATOR_ACTIONS`:

```
name:          'publish_site'
plan_tier:     'paid'
tool_spec:     { description: "Publish the current draft, replacing the live site",
                 input: { site_id: string, description?: string } }
ui_route:      'builder-header-publish-button'
```

Handler semantics:

1. Validate plan tier (already enforced by middleware; defensive recheck).
2. Load `sites.draft_definition` for `site_id`; verify operator owns the site.
3. Run `validate(draft_definition, frameworkCatalog)` — defense-in-depth Layer 3 per [[DOC-7]] §6.5. Reject with `validation:error` if invalid.
4. Insert into `revisions`: `(id, site_id, definition=draft snapshot, published_at=now, published_by=account_id, description)`.
5. Update `sites`: `published_definition = draft_definition`, `published_at = now`, `published_revision_id = new revision id`.
6. Trigger build: call `tools/generate` (invoked as Worker subrequest or queued job — see "Risks").
7. Emit `action:notify` event over SSE: `{action: 'publish_site', status: 'completed', payload: { revision_id, published_at }}`.

Returns `200 {revision_id, published_at}` on success, `400` on validation failure, `403` on plan/auth failure, `409` on concurrent-modification preconditions.

**Concurrency:** the draft snapshotted into the revision is the draft at handler-entry-time. If the AI's mid-turn edits land after this snapshot, those edits apply to the new draft state, not to the published one — matching the lean from CHAT-9.

### `rollback_to_revision` action

```
name:          'rollback_to_revision'
plan_tier:     'paid'
tool_spec:     { description: "Revert the live site to a prior revision",
                 input: { site_id: string, revision_id: string } }
ui_route:      'builder-revisions-panel-rollback-button'
```

Handler semantics:

1. Validate ownership, plan tier.
2. Load target revision; verify `revisions.site_id == site_id`.
3. Update `sites.published_definition = revision.definition`, `published_revision_id = revision_id`, `published_at = now`.
4. Do NOT modify `draft_definition` — per CHAT-9 lean, rollback affects published only; the operator's working draft is untouched.
5. Trigger build with the new published state.
6. Emit `action:notify { action: 'rollback_to_revision', status: 'completed', payload: { revision_id, published_at } }`.

Returns `200 {revision_id, published_at}` on success; 4xx errors as above.

### `list_revisions` action

```
name:          'list_revisions'
plan_tier:     'paid'
tool_spec:     { description: "List the publish history of this site",
                 input: { site_id: string, limit?: number, offset?: number } }
ui_route:      'builder-revisions-panel'
```

Handler semantics:

1. Validate ownership, plan tier.
2. Query `revisions WHERE site_id = ? ORDER BY published_at DESC LIMIT ? OFFSET ?`.
3. Return rows (without the full `definition` JSON — only metadata for the list view; fetch full definition via a separate `get_revision` action in a later REQ if needed).

Returns `200 { revisions: [{ id, published_at, published_by, description }] }`.

### Build trigger

The publish/rollback handlers update `published_definition` in D1 and then need to regenerate the static site. Two implementation options, picked by the implementer:

1. **Inline subrequest** — Worker invokes `tools/generate` directly. Simple; blocks the response until the build completes (5–30s).
2. **Queued job** — Worker enqueues a build job on a Cloudflare Queue; returns immediately; FE waits for `action:notify` with `status: 'build_complete'`.

Lean: **option 1** for v1 (simpler, smaller surface area). Migrate to queues when build times become user-painful or when multiple sites publish concurrently.

### Validation error path

Publish-time validation failures (Layer 3) emit `validation:error` events with the same shape as REQ-9's Layer 1 errors:

```
{ tool: 'publish_site',
  path: 'modules[2].dials.shape',
  expected: ['square','rounded','circle'],
  got: 'cirle' }
```

For AI sessions, these go through the standard self-correction loop. For UI sessions, REQ-12 surfaces them as visible errors.

## UATs (`test_UAT_FC_<REQ-ID>_*`)

- `publish_writes_revision_and_updates_site` — call to `publish_site` with a paid session inserts a revision row and updates `sites.published_definition`.
- `publish_emits_action_notify` — SSE channel emits `action:notify` with `action='publish_site'`, `status='completed'`, `revision_id` matching the new row.
- `publish_rejected_on_trial` — same call with trial session returns 403.
- `publish_rejected_on_invalid_draft` — draft fails site-schema validation; publish returns 400 with `validation:error` event.
- `publish_idempotency` — two rapid identical publishes succeed and produce two distinct revisions (no idempotency assumed; each publish is intentional).
- `rollback_updates_published_only` — `rollback_to_revision` updates `sites.published_definition` but leaves `sites.draft_definition` unchanged.
- `rollback_rejected_on_cross_site_revision` — revision belongs to site A; rollback called with site B returns 404.
- `list_revisions_descending_by_published_at` — list returns revisions newest-first.
- `list_revisions_paginates` — `limit=5, offset=5` returns the second page of revisions.

## Out of scope

- Custom-domain rollouts on publish — later REQ; v1 publishes to `<slug>.1stcontact.io` only.
- Scheduled publish / future-dated publish — later REQ.
- Revision diffing UI — later REQ.
- Partial-page publish (publish a single page from a multi-page site) — later REQ; v1 publishes the whole site.
- Build failure recovery — if the build step fails after the revision is written, the published state in D1 has advanced. v1 accepts this as a known edge case; later REQ adds reconciliation.

## Risks / open items

- **Inline build blocks the response** — 5–30s `tools/generate` invocation under load could time out the Worker. Mitigation: enforce a 30s soft cap; surface long-build warnings. Move to queues if it becomes a real issue.
- **Plan tier in stub auth** — until magic-link auth REQ lands, real sessions are trial. UATs override via header. Production launch needs auth before this REQ is operationally meaningful.
- **Reserved-slug interaction** — publishing the seeded `1stcontact` site (reserved slug, operator-owned account) should work; UAT confirms.
