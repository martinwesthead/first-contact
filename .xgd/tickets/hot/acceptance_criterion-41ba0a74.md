---
uid: acceptance_criterion-41ba0a74
id: AC-485
type: acceptance_criterion
title: Working site definition is persisted to browser storage and survives builder
  re-mount
created_by: xgd
created_at: '2026-06-25T02:00:27.135905+00:00'
updated_at: '2026-06-25T02:00:27.135905+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

The working site definition is persisted to the operator's browser storage after every accepted tool call. When the builder is mounted again against the same storage, the previously edited site is loaded as the starting definition (instead of the fresh starter), so in-progress edits survive a page reload. If the serialised definition exceeds the configured size threshold (≥1MB by default), a console warning is emitted but the definition is still persisted.

## Verification

Mount a builder backed by an in-memory storage facility. Apply a sequence of accepted tool calls (e.g. two `set_theme_token` calls). Confirm the storage now contains a serialised site definition reflecting the cumulative edits. Discard the builder and mount a fresh builder against the same storage. Verify the new builder's starting site definition matches the persisted state (not the fresh starter). Separately, populate the site definition with content that pushes the serialised size past the configured warning threshold; verify a console warning is emitted and the storage entry is still written.
