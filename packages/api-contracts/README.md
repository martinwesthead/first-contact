# @gendev/api-contracts

Zod request/response schemas for the owner-facing API (`/api/owner/v1/*`).

The Worker validates incoming requests against these schemas. Web portal and
mobile clients infer TypeScript types from them via `z.infer`. This is the
same pattern `@gendev/site-schema` already uses for site definitions.

Consumed by:

- `apps/control-app` — server-side validation on the owner-facing API
- Future `apps/xgd-portal` and `apps/owner-mobile` — typed clients

Design references:

- [[DOC-12]] § "Policy" item #8 and "Required Upstream Web Changes" item #2
- [[DOC-5]] § "Operational Data Model"

> Not yet implemented — placeholder for the package skeleton (REQ-50).
