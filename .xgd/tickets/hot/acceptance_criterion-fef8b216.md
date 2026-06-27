---
uid: acceptance_criterion-fef8b216
id: AC-595
type: acceptance_criterion
title: Digest renders as KMS-aware markdown with a single title, ToC, per-category
  sections, and asset inventory
created_by: xgd
created_at: '2026-06-27T01:11:11.683059+00:00'
updated_at: '2026-06-27T01:11:11.683059+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-3f73931a
  kind: behavior
  regression_only: false
---

## Criterion
Given a Reference Digest, the markdown renderer produces a document with the KMS-aware shape: exactly one top-level H1 title naming the source URL; a blockquote summary (the commentary summary, or a placeholder when empty); a "Table of contents" section; numbered sections — one per signal category (Palette, Typography, Layout, Imagery, Content, Asset Inventory) — each listing that category's values; the asset-inventory section split into one sub-list per kind (Images / Backgrounds / Videos) each showing its count; and a "What's missing" section listing the digest's whatsMissing entries (or a "nothing missing" placeholder when the list is empty).

## Verification
Render a fully-populated digest to markdown → assert there is exactly one H1, a blockquote summary line, a "Table of contents" heading, a numbered section heading for each of the six categories, an asset-inventory sub-heading per kind carrying its count, and a "What's missing" section reflecting the whatsMissing entries. Render a sparse digest → assert absent signals appear as `not_detected` text rather than missing lines.
