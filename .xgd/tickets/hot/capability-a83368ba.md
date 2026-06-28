---
uid: capability-a83368ba
id: CAP-49
type: capability
title: Markdown Body Content & Verbatim Capture
created_by: xgd
created_at: '2026-06-28T22:52:19.996012+00:00'
updated_at: '2026-06-28T22:52:19.996012+00:00'
completed_at: null
last_field_updated: created_at
status: active
fields:
  name: markdown_body_content
---

# Markdown Body Content & Verbatim Capture

Establishes markdown as the single lingua franca for all body copy across the
platform. A module's markdown-typed content field accepts EITHER an inline
string OR a text AssetRef pointing at an R2 `.md` file; the choice is per
content instance and promotion/demotion between the two forms is free.

The renderer owns markdown-to-HTML conversion (with an HTML-passthrough sniff
for back-compat) and resolves text AssetRefs through an injected resolver —
live fetch in the builder preview, synchronous build-time read in static
generation, so the public site has zero runtime markdown/blob-store dependency.

The convert flow captures source body copy mechanically (HTML to markdown) and
writes per-section verbatim markdown to blob storage, surfacing ready-made
AssetRefs in the digest so the AI references pre-built copy verbatim instead of
paraphrasing. An operator-directed text-asset write action provides key-guarded
writes for body-copy edits.
