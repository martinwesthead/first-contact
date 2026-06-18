---
uid: doc-7bbab0f4
id: DOC-12
type: doc
title: 'Owner-Facing Mobile Companion: Technology and Web-Architecture Impact'
created_by: xgd
created_at: '2026-06-18T00:26:50.482313+00:00'
updated_at: '2026-06-18T00:46:17.345486+00:00'
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
12. On every successful lead write in `apps/public-site/src/forms.ts`, after the lead is persisted, signal the account's event-bus Durable Object (item #15a) with a `lead.created` event. The DO is the single fan-out point: it broadcasts to currently-connected SSE subscribers and triggers the Resend-email + Expo-push paths for offline devices. The form handler does NOT call Resend or the Expo Push API directly — those side-effects move into the DO. The DO signal itself is best-effort and must not fail the lead write; the existing guarantee is preserved.
13. Defer Cloudflare Queues for notification fan-out until measured volume justifies it. The account event-bus DO (item #15a) handles fan-out inline; Queues would only be needed if (a) per-account volume grows large enough that DO CPU time matters, or (b) cross-account batched delivery is required (e.g. monitoring sweeps notifying many accounts simultaneously and exceeding the DO's per-instance throughput).
14. Implement the monitoring system called for in [DOC-5] § "Basic Monitoring Architecture" as a Cron Trigger Worker that probes each published site, writes results to a `site_status` events table, and on status transition (up→down, down→up) triggers the same notification fan-out (email + push). This unblocks the mobile "site health" surface without inventing new infrastructure.
15. Real-time signal model is **layered by use case**, and the **push channel and the SSE channel are two delivery paths from one event bus** — not duplicate implementations:
    - **Out-of-band signal** (the app is closed/backgrounded, the owner needs to be alerted) — delivered via **push notifications** (APNs/FCM via Expo Notifications). Required v1 infrastructure. Examples: new lead arrived, site went down.
    - **In-app live dashboard updates** (a dashboard, leads inbox, or status screen is open and the owner is actively watching) — delivered via **SSE** as an **account-scoped event subscription** (`GET /api/owner/v1/events`). When a lead lands, an open leads-inbox prepends the row without polling; when site status flips, the badge changes immediately. Both push and dashboard-SSE are driven by the same underlying event signal (see item #15a).
    - **In-app chat streaming** — delivered via **SSE** at a **separate endpoint** with request-response shape (`POST /api/owner/v1/chat`). 1:1 stream, no fan-out, no DO — lives entirely in the request handler. Reuses the control-app's existing builder-chat SSE pattern. Do not conflate this with the dashboard event stream — different shape, different lifecycle, different transport semantics.
    - **List/status freshness** as belt-and-braces (first paint, SSE-reconnect gap) — covered by **TanStack Query's focus-refetch** on screen activation. Not the primary live-update mechanism once dashboard SSE is in place; just the fallback for cold-load and recovery.
    - **Push suppression when SSE is active** — when a dashboard SSE subscriber is connected for an account, the event bus *may* suppress push for that account's devices to avoid double-notifying ("don't ping me, I'm already looking"). This is v1 polish; reasonable to defer to v1.x if the ack model complicates v1. Default v1 behavior: always send push.
    - React Native consumes SSE via the `react-native-sse` polyfill under Expo's managed workflow; no ejection.
    - Do not add WebSockets in v1.x — SSE covers both streaming patterns more cheaply on Workers.
15a. Implement a **per-account event-bus Durable Object** (`AccountEventBus`) as the single fan-out point for owner-visible events. Writers (form handler `lead.created`, monitoring Worker `site.status.changed`, owner-API mutations `lead.updated`, `lead.deleted`) signal the DO with a typed event. The DO is responsible for:
    - Broadcasting the event to all currently-connected SSE subscribers for that account (dashboard live updates).
    - Triggering the Resend-email and Expo-push fan-out for the account's registered devices (out-of-band notification).
    - Optionally suppressing push for devices whose user is an active SSE subscriber (item #15, v1 polish).
    The DO is started lazily on the first signal-or-subscribe for an account and hibernates when no signals or connections are active; idle cost is near-zero. This is the canonical Cloudflare pattern for live-event fan-out and replaces both the inline Resend call currently in the form handler and the dormant push-fan-out path. The DO does NOT persist event history in v1 — clients reconnecting after a gap rely on TanStack Query focus-refetch to backfill (item #15 belt-and-braces). The chat SSE endpoint (item #10a) is **not** routed through this DO — chat is 1:1 request-response, not subscribe-broadcast.
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
4. **Account event-bus Durable Object + device registration + email/push/SSE fan-out** — `AccountEventBus` DO class with lazy startup and idle hibernation, event-type schema, SSE broadcast to connected subscribers, Resend/Expo-Push fan-out to registered devices, `device_registrations` table, register/revoke endpoints. The form handler's existing inline Resend call moves into the DO's fan-out path. `GET /api/owner/v1/events` SSE endpoint exposes the subscription surface. This is the largest single architectural item but consolidates several previously-separate concerns into one logically coherent piece.
5. **Basic monitoring Worker** — Cron Trigger pinging published sites, writing to `site_status`, signaling the account event-bus DO on status transitions (reuses item #4's fan-out).
6. **Owner chat endpoint with non-builder tool surface** — expose `/api/owner/v1/chat` (SSE, 1:1 request-response, NOT routed through the event bus) reusing the existing builder SSE infrastructure, scoped tool surface, and Bearer-token auth. Small layer over existing primitives.

Mobile (`apps/owner-mobile/`) bootstraps only after items 1–3 land. Items 4–6 can land in parallel with mobile if needed but ideally precede the first push-notification feature (item 4) and the first chat screen (item 6).

## Open Questions

- Magic-link → mobile flow: deep-link (Universal Links / Android App Links) vs. paste-code. Deep-link is the better UX but requires associated-domains config on the registered domain. Recommend deep-link with paste-code fallback.
- Multi-account on a single device: should one phone be able to be signed into two owner accounts (e.g. an owner managing two businesses)? MVP says no; design the device-registration FK to permit it later.
- Stats granularity: do we want hourly buckets in v1 or just daily aggregates? Daily is sufficient for the dashboard surface described.
- Push notification permission UX: when do we ask? Recommend deferred (after first lead arrives in-session) rather than on launch.
- Stripe-gated features: which owner-API endpoints respect `plan_tier`? Lead reading and status updates should always work (data-control principle in DOC-5); monitoring frequency, notification volume, and chat tokens-per-month are the natural plan-tier dials.
- Chat tool surface partitioning: should the mobile chat be a `mode=owner` parameter on the existing chat endpoint, or a separate `/api/owner/v1/chat` route? Same infrastructure either way; this is a product/AI-tooling decision about where the system-prompt and tool-list branching lives.
- Chat history persistence and cross-device continuity: should a chat started on mobile be resumable on the portal and vice versa? Architecturally this is a `chat_sessions` table keyed on `account_id`; the question is whether v1 needs it or whether each device gets its own session.
- Push-suppression-during-SSE acknowledgement model: if v1 ships with always-send-push, owners with the dashboard open will get redundant push alerts for events they're already seeing. Worth measuring before deciding whether to invest in the ack-based suppression model in v1.x.
- Event-bus DO eviction and reconnect behavior: when a DO hibernates and an SSE subscriber reconnects, the gap is covered by TanStack Query focus-refetch. Is that sufficient, or do we need a small ring buffer of recent events on the DO for "since last seen" replay? v1 says no; revisit if the gap is visibly clunky.
