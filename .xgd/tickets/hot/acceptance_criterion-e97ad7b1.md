---
uid: acceptance_criterion-e97ad7b1
id: AC-615
type: acceptance_criterion
title: Public-site Worker declares the ASSETS binding in its production environment
  configuration
created_by: xgd
created_at: '2026-06-28T19:50:10.708327+00:00'
updated_at: '2026-06-28T20:01:45.144284+00:00'
completed_at: null
last_field_updated: uat_coverage
status: pending
fields:
  story_uid: story-f632db8a
  kind: behavior
  regression_only: false
  uat_coverage: pass
---

## Criterion

The public-site app's `wrangler.toml` declares the Workers Static Assets binding in its production environment as well as at the top level: an `[env.production.assets]` block whose `directory` is `./public` and whose `binding` is `ASSETS`, matching the top-level `[assets]` block. Because the Wrangler production environment does not inherit the top-level assets block, this is required for production deploys to serve the same generated tree as local dev.

## Verification

Reading the public-site `wrangler.toml` shows both a top-level `[assets]` block and an `[env.production.assets]` block, each declaring `directory = "./public"` and `binding = "ASSETS"`, with the two `directory` values identical.