---
uid: acceptance_criterion-e0f906e1
id: AC-389
type: acceptance_criterion
title: All identifiers align to the 1stcontact slug
created_by: xgd
created_at: '2026-06-25T00:28:48.983614+00:00'
updated_at: '2026-06-25T00:28:48.983614+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-067dc2f8
  kind: behavior
  regression_only: false
---

## Criterion

Every project identifier the platform exposes uses the `1stcontact`
slug — not the legacy `first-contact` slug:

- The root monorepo package's `name` field is `1stcontact`
- The public-site Worker's name in its `wrangler.toml` is
  `1stcontact-public-site`
- The control-app Worker's name in its `wrangler.toml` is
  `1stcontact-control-app`
- The site-definition directory is `sites/1stcontact/`
- The project's `CLAUDE.md` heading begins with
  `Claude Instructions for 1stcontact`

No `first-contact` slug remains in any of these surfaces.

## Verification

Inspect each named file/directory and assert it carries the
`1stcontact` slug. Grep the listed surfaces for `first-contact` and
assert no matches remain.
