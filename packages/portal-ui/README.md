# @gendev/portal-ui

Opinionated portal pages used by every owner-facing surface.

Pages covered:

- Login (magic-link request + post-exchange landing)
- Account (profile, password-free identity, sign-out)
- Billing (plan, subscription, invoice history — backed by `@gendev/billing`)
- Settings (per-account preferences)
- Sites list (the account's owned sites, multi-site shell from day one)

Themed via `@gendev/framework`'s token layer so the portal tracks the brand
of whichever product is hosting it (1stcontact, XGD itself, etc.).

The first consumer is `apps/xgd-portal` — XGD's own customer portal — which
serves as the architectural validation that auth/billing/portal-ui compose
into a working product with zero in-app implementation. 1stcontact's owner
portal is consumer #2.

Supersedes the `packages/ui-kit` stub.

Design references:

- [[DOC-5]] § "Customer Portal as Trust Architecture"
- [[DOC-12]] § "Required Upstream Web Changes"

> Not yet implemented — placeholder for the package skeleton (REQ-50).
