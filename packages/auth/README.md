# @gendev/auth

Headless magic-link authentication primitives.

Responsibilities:

- Magic-link token issuance and exchange (`/auth/magic-link/*`)
- Short-lived access tokens (~15min) + long-lived refresh tokens (~90d)
- Refresh endpoint
- Bearer-token wrapper (`Authorization: Bearer <access_token>`)
- Cookie wrapper for web clients (HttpOnly + Secure)

No UI. Used by `apps/control-app` server-side; will be consumed by future
`apps/xgd-portal` and any owner-facing mobile or web client.

Replaces the interim `apps/control-app/src/safety/account.ts` `x-account-id`
header stub.

Design references:

- [[DOC-12]] § "Required Upstream Web Changes" item #1
- [[DOC-5]] § "Magic-Link Authentication Model"

> Not yet implemented — placeholder for the package skeleton (REQ-50).
