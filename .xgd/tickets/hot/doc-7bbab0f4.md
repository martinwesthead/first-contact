---
uid: doc-7bbab0f4
id: DOC-12
type: doc
title: 'Owner-Facing Mobile Companion: Technology and Web-Architecture Impact'
created_by: xgd
created_at: '2026-06-18T00:26:50.482313+00:00'
updated_at: '2026-06-18T00:43:39.451882+00:00'
completed_at: null
last_field_updated: body
status: null
fields:
  doc_kind: architecture
  references:
  - id: DOC-1
    title: Architecture Policy
  - id: DOC-5
    title: Gendev Website Caretaker Architecture
  - id: CHAT-15
    title: Mobile app technology
---

## Overview

The owner-facing mobile companion is a read-mostly dashboard for the small-business owner: leads inbox, lightweight CRM actions (mark status, add note, mark contacted), site uptime/health, basic stats, push notifications on new leads or site-down events, and an **AI assistant chat** for non-editing tasks (asking about leads, drafting follow-ups, summarizing activity, triggering CRM actions through natural language). It explicitly excludes any site editing, theming, or content authoring — the builder remains web-only, and the mobile chat's tool surface must reflect that scope. The chosen stack is **Expo + React Native** with NativeWind for styling, TypeScript end-to-end, and EAS Build/Submit for delivery to both the App Store and Google Play. Capacitor (web-shell) and pure PWA were considered and rejected: Capacitor compromises long-term feel and a PWA undermines the trust positioning the portal is meant to provide ([DOC-5] "Customer Portal as Trust Architecture"). Critically, the mobile app does not introduce new architectural primitives — it consumes the same Workers API surface the web portal will consume. The architectural impact lands almost entirely on **auth tokenization, owner-facing API namespace, shared contracts, and a push-notification fan-out** — all of which are needed for the portal regardless of mobile, but whose shape changes materially if we plan for mobile from day one rather than retrofitting.

## Policy

1. Build the owner-facing mobile app as an Expo (React Native) workspace under `apps/owner-mobile/`, sharing the existing pnpm monorepo, TypeScript baseline, and ESLint/Prettier configuration.
2. Use **NativeWind** (Tailwind-for-RN) for styling and import the existing theme tokens from `packages/framework`'s token layer so the mobile UI tracks the brand without forking a design system.
3. Defer any native code (Swift/Kotlin) until a concrete capability requires it; v1 must build entirely through EAS without ejecting from Expo's managed workflow.
4. Use **EAS Build + EAS Submit** for CI/CD; do not require a Mac/Xcode for day-to-day development. Authors should be able to ship from any platform.
5. Use **Expo Notifications** (which wraps APNs/FCM) for push; do not integrate APNs or FCM directly in v1.
6. Replace the planned interim `x-account-id` / `x-session-id` header session stub with a **token-based session** (`Authorization: Bearer <access_token>`) from the outset. Magic-link exchange returns a short-lived access token (~15min) + long-lived refresh token (~90d). Web stores both as HttpOnly+Secure cookies; mobile stores both in Expo SecureStore (Keychain/Keystore). The same `/auth/magic-link/exchange` and `/auth/refresh` endpoints serve both clients.
7. Introduce a versioned owner-facing API namespace `/api/owner/v1/*` on the existing `control-app` Worker, distinct from `/api/operator/*` (builder concerns) and the `public-site` form-capture worker. This namespace is the single read/write surface for portal AND mobile.
8. Create a new shared package `@1stcontact/api-contracts` containing Zod schemas for every `/api/owner/v1/*` request and response. The Worker validates incoming requests against the schemas; the mobile app and portal infer TypeScript types from them via `z.infer`. This is the same pattern `packages/site-schema` already uses for site definitions.
9. Add `GET /api/owner/v1/leads` (paginated, filterable by status and date), `GET /api/owner/v1/leads/:id`, `PATCH /api/owner/v1/leads/:id` (status, notes), and `DELETE /api/owner/v1/leads/:id` (privacy-deletion per [DOC-5]) to the owner API. These are required by both portal and mobile; build once.
10. Add `GET /api/owner/v1/sites/:id/status` (current uptime/SSL/form-test state) and `GET /api/owner/v1/sites/:id/stats` (lead count, recent visitor count, conversion rate aggregates) to the owner API.
10a. Add `POST /api/owner/v1/chat` (SSE response, request body carries chat turn + optional session id) to the owner API. The endpoint reuses the control-app's existing SSE event-multiplex implementation (currently powering the builder chat) but exposes a **non-builder tool surface** — CRM actions (mark lead status, add note, draft follow-up email, summarize leads/stats) — and a system prompt that explicitly forbids site-editing tool calls. Whether this is implemented as a `mode` parameter on the existing chat endpoint or as a separate route is a follow-up product decision; the architectural commitment is that mobile chat does NOT spin up a parallel SSE/session/tool stack.
11. Add a `device_registrations` table to D1: `(id, account_id, site_id, platform, expo_push_token, app_version, created_at, last_seen_at, revoked_at)`. Expose `POST /api/owner/v1/devices` to register and `DELETE /api/owner/v1/devices/:id` to revoke. The token rotation flow must handle Expo push token changes silently.
12. On every successful lead write in `apps/public-site/src/forms.ts`, after the existing Resend email best-effort path, fan out to a push-notification best-effort path that resolves all registered devices for `(account_id, site_id)` and posts to the Expo Push API. Both side-effects remain best-effort and must not fail the lead write — preserve the existing guarantee.
13. Defer Cloudflare Queues for notification fan-out until measured volume justifies it. The form handler currently runs Resend inline; push fan-out follows the same pattern. Revisit when either (a) lead volume per site exceeds a threshold that makes inline calls latency-noticeable, or (b) a second notification channel (SMS, webhook) lands.
14. Implement the monitoring system called for in [DOC-5] § "Basic Monitoring Architecture" as a Cron Trigger Worker that probes each published site, writes results to a `site_status` events table, and on status transition (up→down, down→up) triggers the same notification fan-out (email + push). This unblocks the mobile "site health" surface without inventing new infrastructure.
15. Real-time signal model is **layered by use case**:
    - **Out-of-band events** (new lead arrived, site went down) — delivered via **push notifications** (APNs/FCM via Expo Notifications). Only push can wake a backgrounded or killed app. Device registration + push fan-out are required v1 infrastructure.
    - **In-app chat streaming** — delivered via **SSE**. AI chat responses must stream token-by-token; polling is unacceptable UX. The owner-API chat endpoint reuses the control-app's existing SSE event-multiplex pattern (currently used by the builder chat), with sessions scoped per-account and authenticated by Bearer token. SSE is **1:1** (one stream per open chat screen) so no Durable Object or pub/sub is required — the work happens within the request that opens the stream. React Native consumes SSE via the `react-native-sse` polyfill under Expo's managed workflow; no ejection.
    - **In-app list/status freshness** (leads inbox, site status, stats) — covered by **TanStack Query's focus-refetch** on screen activation. No server work needed.
    - **Live cross-device updates** beyond the above (e.g. live leads-inbox badge updating without focus change while user is in another screen) are explicitly out of scope for v1; revisit if the UX demands it. That would be the case requiring a Durable Object or pub/sub fan-out, and is the only case where the cost is non-trivial.
    - Do not add WebSockets in v1.x — SSE covers chat streaming more cheaply on Workers and matches the existing builder pattern.
16. The mobile app must support full offline-tolerant reads via TanStack Query's cache persistence; lead lists, status pages, and stats must remain readable when the app is foregrounded without network. Mutations (status changes, notes) are queued and replayed on reconnect.
17. Account/session model: one operator → one site is acceptable for MVP but the API contracts must accept and return `site_id` on every owner-facing resource, so the existing one-site assumption can lift without breaking clients. Mobile clients are written assuming multi-site from day one (site picker in the shell, even if it shows only one entry in v1).
18. Do not introduce a separate analytics pipeline for stats in v1. Aggregate the existing `leads` table for lead-based stats; add a minimal `site_events` table later (page_view, form_view, form_submit) if/when richer analytics are requested. Stats endpoints in the owner API must shape responses around this future move — return `{ leads_total, leads_this_week, conversion_rate? }` rather than raw event-stream data.
19. Reuse the existing pnpm + Vitest + ESLint baseline for the mobile app. Use **Vitest** for pure-logic and reducer tests; use **Maestro** for UI/end-to-end flows (lead inbox open, mark status, push deep-link). Do not introduce Jest unless a dependency forces it.
20. Use **i18n-ready string handling** (`react-i18next` or equivalent) from the first commit, even if v1 ships English-only. Hardcoded UI strings will be the single hardest thing to retrofit.

## Required Upstream Web Changes (before mobile work begins)

These should be sequenced as XGD tickets BEFORE the first mobile-app scope ticket:

1. **Auth tokenization** — magic-link exchange → access+refresh tokens, refresh endpoint, cookie wrapper for web, contract documented in `api-contracts`. Replaces the `x-account-id` stub.
2. **`@1stcontact/api-contracts` package** — Zod-first contracts, exported types, no runtime side-effects.
3. **Owner-facing API skeleton** — `/api/owner/v1/leads/*` and `/api/owner/v1/sites/:id/{status,stats}` implemented against the existing `leads` table. Portal can consume immediately.
4. **Device registration + push fan-out** — `device_registrations` table, register/revoke endpoints, Expo Push call from form handler. Even before mobile ships, this is dormant infrastructure with zero cost.
5. **Basic monitoring Worker** — Cron Trigger pinging published sites, writing to `site_status`, surfacing through the owner API.
6. **Owner chat endpoint with non-builder tool surface** — expose `/api/owner/v1/chat` (SSE) reusing the existing builder SSE infrastructure, scoped tool surface, and Bearer-token auth. This is a small layer over existing primitives, not net-new chat infrastructure.

Mobile (`apps/owner-mobile/`) bootstraps only after items 1–3 land. Items 4–6 can land in parallel with mobile if needed but ideally precede the first push-notification feature (item 4) and the first chat screen (item 6).

## Open Questions

- Magic-link → mobile flow: deep-link (Universal Links / Android App Links) vs. paste-code. Deep-link is the better UX but requires associated-domains config on the registered domain. Recommend deep-link with paste-code fallback.
- Multi-account on a single device: should one phone be able to be signed into two owner accounts (e.g. an owner managing two businesses)? MVP says no; design the device-registration FK to permit it later.
- Stats granularity: do we want hourly buckets in v1 or just daily aggregates? Daily is sufficient for the dashboard surface described.
- Push notification permission UX: when do we ask? Recommend deferred (after first lead arrives in-session) rather than on launch.
- Stripe-gated features: which owner-API endpoints respect `plan_tier`? Lead reading and status updates should always work (data-control principle in DOC-5); monitoring frequency, notification volume, and chat tokens-per-month are the natural plan-tier dials.
- Chat tool surface partitioning: should the mobile chat be a `mode=owner` parameter on the existing chat endpoint, or a separate `/api/owner/v1/chat` route? Same infrastructure either way; this is a product/AI-tooling decision about where the system-prompt and tool-list branching lives.
- Chat history persistence and cross-device continuity: should a chat started on mobile be resumable on the portal and vice versa? Architecturally this is a `chat_sessions` table keyed on `account_id`; the question is whether v1 needs it or whether each device gets its own session.
