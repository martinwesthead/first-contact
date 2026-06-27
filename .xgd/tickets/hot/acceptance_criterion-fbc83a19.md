---
uid: acceptance_criterion-fbc83a19
id: AC-555
type: acceptance_criterion
title: Internal/SSRF host targets are rejected with a typed reason
created_by: xgd
created_at: '2026-06-27T00:33:15.068284+00:00'
updated_at: '2026-06-27T00:33:15.068284+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-a0482aed
  kind: behavior
  regression_only: false
---

## Criterion

An external fetch attempted against a private, loopback, link-local, cloud-metadata, broadcast, or unspecified address — across IPv4 and IPv6 — is rejected before any network request is made, with a typed `private_ip` reason carrying a detail string identifying the SSRF classification (`private_ip`, `loopback`, `link_local`, `metadata_host`, `broadcast`, or `unspecified`).

This applies to literal IP hosts (e.g. `10.0.0.1`, `127.0.0.1`, `169.254.169.254`, `192.168.0.1`, `::1`, `[fe80::1]`, `[fc00::1]`) and to well-known SSRF hostnames (`localhost`, `metadata.google.internal`, `metadata.aws.internal`, `metadata.azure.internal`).

## Verification

Through the safety contract's exposed validation surface, attempt fetches to representative addresses from each blocked class and assert that each is rejected with reason `private_ip` and the expected detail string. No outbound request must be observed for blocked targets.
