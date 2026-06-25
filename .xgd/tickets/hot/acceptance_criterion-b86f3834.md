---
uid: acceptance_criterion-b86f3834
id: AC-388
type: acceptance_criterion
title: Deploy workflow injects Cloudflare credentials into the deploy job
created_by: xgd
created_at: '2026-06-25T00:28:44.495574+00:00'
updated_at: '2026-06-25T00:28:44.495574+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-067dc2f8
  kind: behavior
  regression_only: false
---

## Criterion

The deploy workflow exposes both Cloudflare credentials to the
deploy job's environment:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Both values are sourced from the corresponding GitHub Actions
secrets so wrangler can authenticate at deploy time. Credentials
are NOT exposed to the CI workflow (which only dry-runs).

## Verification

Parse the deploy workflow and assert that the deploy job's `env`
block declares both variables and that each is sourced from a
GitHub secret of the same name. Parse the CI workflow and confirm
neither credential is injected into its job env.
