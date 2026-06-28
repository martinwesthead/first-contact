---
uid: acceptance_criterion-cdebc7cc
id: AC-701
type: acceptance_criterion
title: bootBuilder registers the transcribe-progress renderer so transcribe_site_done
  renders the multi-stage card not the summary fallback
created_by: xgd
created_at: '2026-06-28T23:32:43.176529+00:00'
updated_at: '2026-06-28T23:32:43.176529+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-2524a1ae
  kind: behavior
  regression_only: false
---

## Criterion
The builder registers the transcribe-progress renderer at boot, so a `transcribe_site_done` tool result renders the multi-stage progress card (stage list + asset-mirror count + failures) rather than the plain summary fallback card. Booting the builder registers it alongside the digest-report renderer.

## Verification
Clear the tool-result renderer registry, boot the builder, then resolve the renderer registered for the `transcribe_site_done` kind and assert it is present. Render a `transcribe_site_done` result and assert the multi-stage progress card (info-toned "Converting {url}" with the five-row stage list) is produced, not the generic summary card.
