---
uid: acceptance_criterion-3e12128d
id: AC-455
type: acceptance_criterion
title: CLI exits non-zero with a stderr message describing the failure when generation
  fails
created_by: xgd
created_at: '2026-06-25T01:24:54.544588+00:00'
updated_at: '2026-06-25T01:24:54.544588+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-d111f966
  kind: behavior
  regression_only: false
---

## Criterion

When the generator fails for any reason during a CLI invocation (missing `site.json`, malformed JSON, schema validation failure, render failure, write failure), the CLI process exits with a non-zero status code and writes a single line to stderr beginning with `Generation failed:` followed by the underlying error message. No success summary is written to stdout.

## Verification

Invoke the CLI as a subprocess against a fixture site with a known validation failure. Assert that the process exits with a non-zero status code, that stderr contains a line beginning with `Generation failed:` followed by the relevant error message, and that stdout does not contain the success summary line.
