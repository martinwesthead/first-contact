---
uid: acceptance_criterion-4c4786f6
id: AC-461
type: acceptance_criterion
title: Public-site build, deploy, and dry-run scripts regenerate the static bundle
  from sites/1stcontact before continuing
created_by: xgd
created_at: '2026-06-25T01:35:52.819513+00:00'
updated_at: '2026-06-25T01:35:52.819513+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f632db8a
  kind: behavior
  regression_only: false
---

## Criterion

The public-site app's `build`, `deploy`, and `dryrun` scripts each produce a fresh generated bundle from the 1stcontact site definition before invoking their downstream command (type-check, `wrangler deploy`, or `wrangler deploy --dry-run`). Running any of these scripts from a clean working tree results in the generated output tree existing under the app's static-assets directory with the site definition's pages and theme stylesheet present.

## Verification

For each of the three scripts, running it from a state in which the static-assets directory does not contain the expected generated files results in those files being present afterwards, with the downstream command observed to have run only after generation produced its outputs.
