---
uid: request-b9a3a6dc
id: REQ-18
type: request
title: Publish action + R2 site snapshots + History tab for revert
created_by: xgd
created_at: '2026-06-16T23:20:30.006555+00:00'
updated_at: '2026-06-16T23:20:30.006555+00:00'
completed_at: null
last_field_updated: created_at
status: draft
fields:
  story_points: 8
  priority: medium
  auto_merge_back: true
  needs_review: false
---

# Publish action + R2 site snapshots + History tab for revert

## Problem

Operators need a way to freeze a known-good state of a site and revert to it later. Today the builder mutates a live site definition; there is no published-vs-draft distinction and no way to roll back a bad change. We need:

1. A **Publish** action that freezes the current site definition into an immutable snapshot.
2. **Snapshot storage** in R2 with version metadata.
3. A **Revisions tab** that lists snapshots and supports reverting to one.

## Decisions made in design discussion

- **Trigger**: explicit Publish action only. No auto-snapshot on every edit — too noisy, would flood R2 with junk versions.
- **Storage**: R2. Keys `revisions/<site>/<iso-timestamp>-<sha>.json` for the snapshot body, plus `revisions/<site>/index.json` enumerating versions (timestamp, author, optional commit message, content sha). D1 alternative considered and rejected for v1 — R2-only is simpler and the index file is small enough to read whole.
- **Revisions tab**: lives in the app shell as `revisions` tab (registered after REQ-UI-APP-SHELL lands). Default chat collapsed.
- **Revert mechanism**: reverting is itself a publish of the historical snapshot — produces a new revision entry pointing back at the source. No destructive overwrite of the index.
- **Asset references in snapshots** — open design question, see below.

## Open design question — asset references

Site definitions contain `AssetRef` pointers (per `packages/site-schema/src/schema.ts`). When we snapshot a site, what happens to the assets the snapshot references?

**Option A — reference-only (recommended)**: The snapshot stores only `AssetRef` keys. Assets are mutable independently. A delete on an asset that any revision still references is **soft-blocked** — surface "this asset is referenced by N revisions; archive instead?" UI.
- Pro: cheap, no R2 blob duplication.
- Con: snapshots are not truly immutable — an asset can be replaced in place and old revisions render with the new content. Need an asset-revision-pinning story to make this fully safe.

**Option B — copy blobs per revision**: Each publish copies referenced blobs into `revisions/<site>/<rev>/assets/<key>`. Snapshots are truly immutable.
- Pro: revert really restores the past.
- Con: R2 cost; large image-heavy sites multiply storage. Garbage-collection on old revisions becomes a concern.

**Option C — content-addressed assets**: Assets stored by content hash; AssetRefs resolve to `<hash>`. New version of an asset gets a new hash; old revisions still point at the old hash. No duplication beyond what version proliferation naturally requires.
- Pro: clean immutability, minimal duplication.
- Con: invasive — changes AssetRef shape in `site-schema`, requires rethinking the Assets tab UI (which currently shows filename-keyed assets, per REQ-16).

**Recommendation**: ship Option A in v1 with the soft-block-delete UX; revisit Option B or C if/when storage pressure or audit requirements demand true snapshot immutability.

## Scope

### IN

- **Publish action** in the Builder tab toolbar:
  - "Publish" button. On click, opens a dialog: optional commit message, confirm.
  - On confirm: serialize current site definition to JSON, compute SHA-256, `PUT` to `revisions/<site>/<timestamp>-<sha>.json`, then atomically rewrite `revisions/<site>/index.json` with the new entry prepended.
  - Idempotency: if the latest revision has the same sha as the current state, no-op (avoid duplicate revisions).
- **Worker routes** on control-app:
  - `POST /api/revisions/publish` → body `{message?: string}`. Publishes the current draft.
  - `GET /api/revisions/list` → returns `index.json` contents.
  - `GET /api/revisions/<rev-id>` → returns the snapshot body.
  - `POST /api/revisions/revert` → body `{rev_id: string}`. Loads the snapshot, calls the publish path, producing a new revision entry with `revert_of: <rev-id>` metadata.
- **Revisions tab** UI:
  - List view: revisions newest-first. Each row: timestamp, author, message, sha (short), "Revert" affordance.
  - Detail view: selected revision shows the full message, a copy-link to the snapshot JSON, "Revert to this version" action with confirm.
  - No diff view in v1 (deferred — see OUT).
- **Asset soft-block on delete** (Option A from open question):
  - `DELETE /api/assets/delete/<key>` checks every revision's `index.json` (and possibly the snapshot bodies) for AssetRef hits. If any hit, return 409 with the list of referencing revisions. UI surfaces the conflict.

### OUT (deferred)

- **Diff view between revisions** — separate REQ. Visualising site-definition diffs is non-trivial (JSON deep-diff with module-aware grouping).
- **Auto-snapshot on every edit** — explicitly rejected.
- **Snapshot of asset blobs** (Options B/C) — see open question.
- **Audit / who-published-what trail** — minimal metadata in v1 (`author` is operator initials only); proper auth-bound author identity waits for REQ-AUTH.
- **Scheduled publish / staging environments** — not in scope.
- **Garbage collection of old revisions** — keep all revisions in v1; revisit when storage cost demands it.

## Dependencies

- **Blocking**: **REQ-UI-APP-SHELL** — provides the tab the Revisions UI docks into.
- **Soft**: **REQ-16** (Assets) — the soft-block-on-delete check in the assets DELETE handler depends on this REQ existing for the check to be useful. If this REQ lands after REQ-16, the assets DELETE handler grows a feature flag for the soft-block.

## Acceptance criteria

1. Operator clicks Publish in Builder tab; dialog accepts optional commit message; confirm produces a new revision visible in the Revisions tab.
2. The new revision's snapshot in R2 is byte-identical to the site definition served by the Builder at publish time.
3. Publishing with no changes since the last revision is a no-op (no duplicate row in the index).
4. Revisions tab lists revisions newest-first with timestamp, author, message, sha.
5. Clicking a revision shows detail view with full message and "Revert to this version" action.
6. Revert produces a new revision entry with `revert_of: <source-rev-id>` and the site definition matches the source revision exactly.
7. Deleting an asset referenced by any revision returns 409 with the referencing revision list; UI surfaces the conflict.
8. Deleting an asset not referenced by any revision succeeds as before.
9. The Publish action survives a mid-write failure — partial revision files do not corrupt `index.json` (use a temp-key + rename pattern, or rewrite the index last).

## Story points

8. Worker routes (4) + Publish dialog + Revisions tab UI + asset cross-reference check + atomicity + revert flow + AC for 9 behaviors.

## Test plan

UAT tests `test_UAT_FC_<TICKET-ID>_*.ts`. Vitest + Miniflare (R2 emulator).

- `_publish_creates_revision.ts` — make an edit, publish, list shows the new revision with the right metadata.
- `_publish_no_op.ts` — publish twice without edits; second publish does not add a row.
- `_revert_restores_state.ts` — publish v1, edit, publish v2, revert to v1, site matches v1 byte-for-byte; new index row with `revert_of: <v1-id>`.
- `_asset_softblock_delete.ts` — publish with an asset reference, attempt delete, 409 with referencing revision list.
- `_asset_delete_unreferenced.ts` — delete an asset that no revision references, succeeds.
- `_publish_atomicity.ts` — simulate failure mid-publish (e.g. before index rewrite); state is recoverable, no orphaned revisions.

## Design discussion — excerpts from session 2026-06-16

> **User:** I think there is also a versioning question that we should visit. I think we agreed that we're basically going to store snapshots of the site. Anytime you hit publish we store that version in history and can revert to it. That probably means we need a history tab for version management.

> **Assistant:** Versioning — yes, agreed, but separate REQ. Sketch:
> - **Trigger**: explicit "Publish" action (no auto-snapshot on edit — too noisy).
> - **Storage**: R2 keys `revisions/<site>/<iso-timestamp>-<sha>.json` for the snapshot, with a sibling `revisions/<site>/index.json` enumerating versions (timestamp, author, optional message, sha). D1 alternative if we want queryability; R2 is simpler.
> - **Assets in revisions**: open question — do snapshots include asset references only (current model) or copies of asset blobs at that version? Copying R2 blobs per revision is expensive; reference-only means a deleted asset breaks an old revision. Probably reference-only with a soft-delete policy on assets that any revision references. Worth its own design pass.
> - **History tab**: list of revisions, diff view, "Revert to this version" action. Revert is itself a publish of the historical snapshot.

> **Assistant (storage clarification):** Wins of file-backed: assets stay in git alongside the site definition.
>
> **User:** I thought we decided the site definition was not going to be in git? We were going to store it in R2 I think? R2 sounds like the right answer here.

That last exchange settles a broader question that matters for this REQ too: **the site definition itself lives in R2, not git**. This is the same `ASSETS_BUCKET` story — snapshots, definitions, and assets all live in R2.
