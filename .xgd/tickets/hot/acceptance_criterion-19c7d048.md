---
uid: acceptance_criterion-19c7d048
id: AC-776
type: acceptance_criterion
title: Services-grid item schema requires heading and markdown body, allows optional
  asset-ref image and CTA, and rejects a string image or missing heading
created_by: xgd
created_at: '2026-06-30T00:52:05.486773+00:00'
updated_at: '2026-06-30T00:52:05.486773+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f1e061ba
  kind: behavior
  regression_only: false
---

## Criterion

A services-grid item is an object requiring a `heading` (string) and a `body` (markdown), with an optional `image` that must be an asset reference (no bare-string fallback) and an optional `cta` `{label, href}`. Content validation rejects an item whose `image` is supplied as a bare string, an item missing its `heading`, and an item missing its `body`, with the violation path identifying the offending item field. A well-formed item — heading plus body, with or without an asset-ref image and with or without a `{label, href}` cta — is accepted.

## Verification

Validate a services-grid item with `image` given as a bare string: expect rejection with a violation path identifying the item's `image` field. Validate an item missing `heading`: expect rejection identifying the item's `heading` field. Validate an item missing `body`: expect rejection identifying the item's `body` field. Validate well-formed items (heading + body; with and without an asset-ref image; with and without a `{label, href}` cta): expect acceptance.
