---
uid: acceptance_criterion-0a693de2
id: AC-398
type: acceptance_criterion
title: Validator returns ValidationError list with JSON-pointer paths on failure
created_by: xgd
created_at: '2026-06-25T00:39:07.343913+00:00'
updated_at: '2026-06-25T00:39:07.343913+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-aecb7377
  kind: behavior
  regression_only: false
---

## Criterion

On failure, `validateSite()` returns `{ ok: false, errors }` where
`errors` is an array of `{ path, message }` entries. Each `path`
is a JSON pointer (RFC 6901 syntax: `/`-delimited, with `~0` /
`~1` escapes for `~` and `/`) locating the offending field inside
the input. The failure branch narrows at compile time so callers
can read `errors[i].path` and `errors[i].message` without
runtime type assertions.

## Verification

Pass a malformed input (e.g. `{ totally: 'wrong' }`) to
`validateSite()` and assert:
- the failure branch is returned;
- `errors` is an array of objects with string `path` and string
  `message` (compile-time check via `expectTypeOf`);
- at least one `path` begins with `/` (or is `""` for root-level
  errors) and uses `/` as the separator.
