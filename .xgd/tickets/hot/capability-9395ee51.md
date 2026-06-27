---
uid: capability-9395ee51
id: CAP-46
type: capability
title: Reference Digest Extraction
created_by: xgd
created_at: '2026-06-27T01:09:30.800931+00:00'
updated_at: '2026-06-27T01:09:30.800931+00:00'
completed_at: null
last_field_updated: created_at
status: active
fields:
  name: reference_digest_extraction
---

Deterministic analysis of an external reference website into a single canonical artifact — the Reference Digest — that both the operator and the AI assistant consume as shared evidence.

The capability captures a fetched HTML document's visible design characteristics (color palette, typography, layout, imagery/asset inventory, and content structure) as a stable, schema-validated structure, and renders that structure as a human-readable KMS-aware markdown document. Per DOC-9 §3 the convergence — one artifact, two audiences — is a load-bearing design property: it makes AI reasoning auditable against something the operator can read.

This capability owns the extraction and rendering primitives. Fetch-time concerns (safety, robots, rate limiting, caching), the AI commentary pass, and the chat-card rendering of the digest are owned by the Operator API and External Fetch Safety capabilities and the analyze_page action that wires them together.
