---
uid: acceptance_criterion-f503d328
id: AC-586
type: acceptance_criterion
title: Starter site is fetched from same-origin at SPA boot, selected via ?site= with
  1stcontact default
created_by: xgd
created_at: '2026-06-27T00:56:53.565542+00:00'
updated_at: '2026-06-27T00:56:53.565542+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

On SPA boot the builder fetches a starter site definition from the same origin at `/starter-sites/<name>.json` and uses it as the initial working site definition. The `?site=<name>` query parameter selects which starter is loaded; when `?site=` is absent or empty the default starter `1stcontact` is loaded (i.e. `/starter-sites/1stcontact.json`).

## Verification

Boot the SPA against a same-origin server that serves starter definitions at `/starter-sites/<name>.json`. With no `?site=` query parameter, verify the SPA issues a fetch for `/starter-sites/1stcontact.json` and adopts the returned definition as its initial working site. Reboot with `?site=acme` and verify the SPA instead fetches `/starter-sites/acme.json` and loads that starter. Confirm the `1stcontact` default is applied only when `?site=` is absent or empty.