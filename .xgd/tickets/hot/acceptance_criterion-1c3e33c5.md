---
uid: acceptance_criterion-1c3e33c5
id: AC-638
type: acceptance_criterion
title: 'Per-page plan: same-origin cached pages discovered, distinct slugs, cross-origin
  excluded, unbounded'
created_by: xgd
created_at: '2026-06-28T20:29:43.072471+00:00'
updated_at: '2026-06-28T20:29:43.072471+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f45a5e61
  kind: behavior
  regression_only: false
---

## Criterion
When the home page's nav links point at same-origin pages that already have a cached Reference Digest, the blueprint's per-page plan gains one additional entry per such page. Each entry's slug is distinct (no duplicate slugs across the plan). Nav links to other origins do not produce entries — every plan entry's URL shares the home origin. No maximum page count is enforced: a source with N discoverable same-origin pages yields N+1 (or more) entries, limited only by what is cached, not by a hard cap.

## Verification
Seed a home digest whose nav links include two same-origin paths (each with a cached digest) and one cross-origin link; produce the blueprint. Assert the per-page plan has at least three entries, all slugs are distinct, the slugs include the two child paths and `/`, and every entry URL begins with the home origin (the cross-origin link is absent).
