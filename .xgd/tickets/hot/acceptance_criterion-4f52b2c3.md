---
uid: acceptance_criterion-4f52b2c3
id: AC-832
type: acceptance_criterion
title: Preview is captured from the draft's own rendered HTML inline; digest sourceUrl
  is a synthetic preview:// identifier
created_by: xgd
created_at: '2026-06-30T06:25:01.210789+00:00'
updated_at: '2026-06-30T06:25:01.210789+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-bab9b773
  kind: behavior
  regression_only: false
---

## Criterion
The page that gets captured is the draft's own rendered HTML, supplied to the rendering engine self-contained (inline) rather than fetched from an external/localhost origin — the rendered content includes the draft's actual headings. The digest's `sourceUrl` is a synthetic `preview://` identifier (never an http, https, or data URL), giving the chat card a stable, human-readable handle that does not expose a fetchable or raw-data route.

## Verification
Invoke the tool and assert that (a) the content handed to the rendering engine decodes to HTML containing the draft's headings (proving the draft is captured inline, with no external-origin round-trip), and (b) the digest's `sourceUrl` uses the `preview://` scheme and is neither an http/https nor a data URL.
