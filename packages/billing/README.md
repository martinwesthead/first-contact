# @gendev/billing

Stripe wrappers for customer lifecycle, subscriptions, webhook handling, and
plan-tier checks.

Responsibilities:

- Stripe customer + subscription helpers
- Webhook event handlers (subscription lifecycle, payment status)
- Plan-tier predicates (`hasPlan(tier)`, `requirePlan(tier)`)
- Invoice / payment metadata retrieval

The platform deliberately stops at "collect money via Stripe" — accounting,
payroll, inventory, ERP, and fulfillment are out of scope. Credit card data
is never stored locally; only Stripe IDs and status metadata.

Consumed by:

- `apps/control-app` — subscription gating, webhook intake
- Future `apps/xgd-portal` and `apps/owner-mobile` — surfacing invoice / plan state

Design references:

- [[DOC-5]] § "Payments and Invoicing"

> Not yet implemented — placeholder for the package skeleton (REQ-50).
