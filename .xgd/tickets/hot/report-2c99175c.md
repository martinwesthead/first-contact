---
uid: report-2c99175c
id: REPORT-614
type: report
title: 'Resync resolve conflicts: 393ea07289005dc2b83294d2dbb95d9e3563c1d3'
created_by: xgd
created_at: '2026-06-27T01:09:46.867753+00:00'
updated_at: '2026-06-27T01:09:46.867753+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: resolve_conflicts
  subject_uid: report-ebefc874
---

## Files resolved

- `package.json` — class UU (both modified). Rule 2g (config, scalar conflict → incoming wins). Conflict was limited to two devDependency version strings; took the incoming (CHERRY_PICK_HEAD `40d7ded8`) bumped values: `@cloudflare/workers-types ^4.20260617.1`, `@vitest/coverage-v8 ^2.1.9`. Rest of file unchanged.
- `packages/web-fetch-safety/package.json` — class DU (main deleted, incoming modifies). Rule 2a: incoming modification is meaningful — `40d7ded8` is a deliberate `[FREE-CODED]` dep bump whose commit body explicitly lists this package's `@cloudflare/workers-types` bump. Restored the incoming version via `git checkout 40d7ded8 -- <path> && git add` rather than accepting the deletion, to avoid discarding developer code.

## Incoming changes preserved

- `package.json`: resolved file contains `@cloudflare/workers-types ^4.20260617.1` and `@vitest/coverage-v8 ^2.1.9` — byte-identical to `40d7ded8:package.json`.
- `packages/web-fetch-safety/package.json`: resolved file contains `@cloudflare/workers-types ^4.20260617.1` — the incoming bump from `40d7ded8`.

Staging verified clean: no UU/AA/DU/UD entries remain; resolution produces a net change from HEAD (root `package.json` bumped, `web-fetch-safety/package.json` added).
