---
uid: acceptance_criterion-303d93dd
id: AC-572
type: acceptance_criterion
title: Operator messages containing a URL or fetch keyword imply fetch intent
created_by: xgd
created_at: '2026-06-27T00:35:27.094546+00:00'
updated_at: '2026-06-27T00:35:27.094546+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a0482aed
  kind: behavior
  regression_only: false
---

## Criterion

The safety contract exposes an "operator message implies intent" predicate that returns true when the operator's text contains either:
- A URL matching `https?://...`, or
- A fetch-related keyword (case-insensitive): one of `fetch`, `download`, `grab`, `crawl`, `scrape`, `screenshot`, `reference`, `inspiration`, `import`, or the phrase `copy from`.

It returns false for messages with none of the above (including the empty string).

The chat dispatcher uses this predicate to decide whether to mint a 60-second operator-intent token for the upcoming AI tool turn.

## Verification

Call the predicate with representative inputs and assert:
- `"Have a look at https://example.com please"` → `true` (URL pattern).
- `"Can you grab the homepage for me"` → `true` (keyword `grab`).
- `"COPY FROM that other site"` → `true` (case-insensitive phrase).
- `"Make the homepage blue"` → `false` (no URL, no keyword).
- `""` → `false`.
