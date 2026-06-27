---
uid: capability-f446e94d
id: CAP-44
type: capability
title: External Fetch Safety
created_by: xgd
created_at: '2026-06-27T00:32:31.510170+00:00'
updated_at: '2026-06-27T00:32:31.510170+00:00'
completed_at: null
last_field_updated: created_at
status: active
fields:
  name: external-fetch-safety
---

Foundational platform service that enforces a uniform safety contract on every external URL fetch performed by any operator action.

The contract covers:
- SSRF protection across IPv4 and IPv6 (RFC1918, loopback, link-local, cloud metadata, broadcast, unspecified)
- Scheme restriction (https always; http only on operator-approved same-origin within the same chat session)
- Redirect handling with per-hop re-validation, capped at 5 hops
- Body size cap (5 MB) with mid-stream abort and no partial body delivery
- KV-backed response cache (1 hour TTL, keyed by method + URL + range)
- robots.txt respect with longest-match precedence and per-chat operator overrides (no global ignore)
- Per-account rate limits (hour / day / burst windows)
- Browser-rendering compute budget (per chat session and per account UTC day)
- 60-second one-shot operator-intent tokens — no AI fetch without recent operator intent
- Diagnostic endpoint exposing the calling account's rate-limit state

Per DOC-9 §11 the contract is non-negotiable: no fetch path may bypass it. Consumed by downstream operator actions (analyze_page, browser-render, transcribe, search-references) but exists independently as a peer to the Operator API capability.
