---
uid: request-6c2548be
id: REQ-2
type: request
title: Rename code identifiers from first-contact to 1stcontact to align with domain
created_by: xgd
created_at: '2026-06-12T22:21:53.129271+00:00'
updated_at: '2026-06-15T22:41:00.373496+00:00'
completed_at: null
last_field_updated: status
status: bundled
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
  commits:
  - f53c97229b5b6a1c01a644e990bf079aefa4b422
  bundled_in: bundle-94e1d1b6
---

## Scope

Domain registered as `1stcontact.io`. GitHub repo already renamed from `first-contact` to `1stcontact`. This ticket covers aligning code/config slugs in the working tree so they match the new domain/repo convention.

## Concrete changes

1. Rename `sites/first-contact/` → `sites/1stcontact/` (single README inside)
2. `sites/1stcontact/README.md`: update heading `# sites/first-contact` → `# sites/1stcontact`
3. `package.json`: `"name": "first-contact"` → `"name": "1stcontact"` (root monorepo package name only — does not affect any package consumer; `apps/*`, `packages/*`, `tools/*` already use `@1stcontact/...` scope)
4. `apps/control-app/wrangler.toml`: worker name `first-contact-control-app` → `1stcontact-control-app`
5. `apps/public-site/wrangler.toml`: worker name `first-contact-public-site` → `1stcontact-public-site`
6. `CLAUDE.md`: heading `# Claude Instructions for first-contact` → `# Claude Instructions for 1stcontact`

## Out of scope

- Project directory rename (`/Users/martin/Projects/first-contact` → ...) — user will do later
- Display name "First Contact" → "1st Contact": no occurrences in code/docs found (only inside `.xgd/tickets/`, which is a ticketing internal and not touched directly)

## Behaviour validation

This is a rename / config slug change with no runtime logic to UAT:
- `sites/` is not in `pnpm-workspace.yaml` (only `apps/*`, `packages/*`, `tools/*`), so the directory rename has no workspace impact
- Wrangler `name` only affects the deployed worker identifier; routes (already `1stcontact.io`) are unchanged
- Root `package.json` `name` is private and not published

Verification: `pnpm install --frozen-lockfile=false` resolves cleanly, `pnpm -r build` continues to pass (TBC after change).


## Update: doc-ab7508c1 included

Architecture doc DOC-7 (`doc-ab7508c1`) also updated to match:
- Title "First-Contact Website Framework" → "1st Contact Website Framework"
- Prose mentions of "first-contact" (the product) → "1st Contact"
- Path/tree references (`sites/first-contact`, repo root `first-contact/`) → `1stcontact` slug

Pushed via `xgd ticket update --body-file` (auto-commit `a7cb585`).