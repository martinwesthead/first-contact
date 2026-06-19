---
uid: chat-9a512e7f
id: CHAT-15
type: chat
title: Mobile app technology
created_by: xgd
created_at: '2026-06-18T00:16:23.943504+00:00'
updated_at: '2026-06-18T00:46:33.187543+00:00'
completed_at: null
last_field_updated: body
status: open
fields: {}
---

<!-- xgd-turn id="ade63399-b816-4a36-8a03-3f21b623eac9" -->

<!-- xgd-chat role="user" ts="2026-06-18T00:20:35.984Z" -->
#### You
I am tempted to create a simple mobile app that would let the small business owner check on the leads and site statistics and make sure that everything was up. No sophisticated builder no ability to be able to modify the site just a dashboard with perhaps some very simple CRM actions and monitoring results. It would probably be easier for us to create a JavaScript app then to go all in on a native app. I am also thinking that a JavaScript app would be easier to get running on both android and iOS. What are your thoughts on the technologies here. Part of my motivation is honestly that we are in a good place with XGD and JS including JS testing - iOS is a real beast. We will have to take it on at somepoint but maybe it should be later.

How bad would a JS app be - can we make it nice?

<!-- xgd-chat role="assistant" ts="2026-06-18T00:20:35.984Z" -->
#### Claude
A JS mobile app for this scope can be genuinely nice — we're not in 2016 anymore. Shopify, Discord, Coinbase, and a lot of the apps your customers already use are React Native. For a read-mostly dashboard with notifications and a few CRM actions, you'd be hard-pressed to tell it from native, and the parts that *would* feel off in a builder (gestures, complex animation, layout responsiveness) aren't in scope here.

My recommendation: **Expo + React Native**. Three reasons specific to your situation:

1. **Expo eliminates the iOS beast you want to defer.** EAS Build handles signing, provisioning profiles, App Store submission, and OTA updates from a Mac-less CI. You write JS/TS, push to EAS, get an `.ipa`. You'll still meet Apple eventually (review process, capabilities config) but you skip the Xcode/Swift/AppKit learning curve entirely.
2. **Your React + Tailwind + shadcn knowledge transfers** — RN has NativeWind (Tailwind for RN), and the component model is identical. The Worker API you're already building for the portal is the same backend.
3. **Push notifications are first-class.** Expo Notifications wraps APNs/FCM cleanly, which matters here — the killer feature of this app is "ping me when a lead comes in," and you don't want to fight platform notification APIs.

The main tradeoff vs. native: when you eventually need something exotic (deep widget integration, ARKit, complex gesture choreography), you'll hit the bridge. For a dashboard, you won't.

**Cheaper alternative if you want it shipping in weeks, not months:** Capacitor wrapping a slimmed-down version of your control app's portal. You reuse the existing React/shadcn code almost verbatim, get app store presence, get push, and don't run a second codebase. It will feel slightly more "web-y" — scrolling momentum, keyboard behavior, transitions — but for an internal-feel dashboard tool that's fine. The reason I'd still steer toward Expo is that the moment you want this to feel like a *product* rather than a *companion view*, Capacitor's seams start showing.

A pure PWA I'd skip. iOS push finally works (16.4+, fully landed by now) but install friction, no app store presence, and no path to trust badges undermine the "small business owner trusts this with their leads" positioning.

Want me to sketch a more concrete plan — module split, what reuses from the existing packages, deployment model — as a DOC ticket? That would be the right next step before any code.


<!-- xgd-turn id="074d3f44-8d5f-48b0-b846-b6f7753a0574" -->

<!-- xgd-chat role="user" ts="2026-06-18T00:27:10.836Z" -->
#### You
Yes please start looking at it - we have a big list of tickets queued up to implement and if this would impact our web architecture it would be a good time to make the necessary changes

<!-- xgd-chat role="assistant" ts="2026-06-18T00:27:10.836Z" -->
#### Claude
Solid picture. Let me check the existing ticket backlog so I don't duplicate scope, and look at the auth/leads docs that were referenced.

Strong existing architecture policy — DOC-1/DOC-5 already commit to the JAMstack + Workers + D1 + magic-link model, and explicitly call out a customer portal and monitoring as first-class. The mobile app slots cleanly into that picture; the question is what to lock in *now* so we don't have to retrofit when mobile lands.

Let me draft the doc.

Created **DOC-12: Owner-Facing Mobile Companion: Technology and Web-Architecture Impact**.

The headline architectural impacts on the web side — all of which are needed for the portal *regardless* of mobile, but whose shape changes if we plan for mobile now:

1. **Auth tokenization first.** Replace the planned `x-account-id` header stub with `Authorization: Bearer` tokens (access + refresh). Web wraps in HttpOnly cookies, mobile uses Expo SecureStore. **Same exchange and refresh endpoints serve both.** Doing this before any auth code lands costs nothing; retrofitting later costs a lot.
2. **New `/api/owner/v1/*` namespace** on the control-app Worker — distinct from `/api/operator/*` (builder) and the public-site form capture. Single read/write surface for portal *and* mobile.
3. **`@1stcontact/api-contracts` package** — Zod-first contracts, exactly the pattern `packages/site-schema` already uses. Worker validates, both clients infer types.
4. **`device_registrations` table + Expo push fan-out** added to the existing form handler alongside the Resend email path. Dormant until mobile ships; trivially small.
5. **Monitoring Cron Worker** (already called for in DOC-5 §"Basic Monitoring") writes to `site_status` and triggers the same notification fan-out.

Notable explicit non-changes:
- **No SSE/WebSockets** in the owner API — mobile uses push, portal polls.
- **No Cloudflare Queues** for notifications yet — inline best-effort matches the existing Resend pattern; revisit when a second channel or volume justifies it.
- **No separate analytics pipeline** in v1 — aggregate `leads` for stats; the response shape leaves room for a future `site_events` table without breaking clients.

The doc closes with a five-item sequenced upstream worklist (auth → contracts → owner-API → device-registration → monitoring) and five open questions (magic-link mobile flow, multi-account-per-device, stats granularity, push-permission UX timing, Stripe plan gating).

Recommended next step: read DOC-12 (`xgd ticket get DOC-12`), then I can break the five upstream items into scope tickets — those are the ones that should land in your queue ahead of the existing tickets that touch auth, leads-API, or the form handler, since reworking them later is the expensive case.


<!-- xgd-turn id="c361fa4f-8927-4b3c-bf89-db0e29e75f92" -->

<!-- xgd-chat role="user" ts="2026-06-18T00:41:28.624Z" -->
#### You
We can't use SSE to a JS app?

<!-- xgd-chat role="assistant" ts="2026-06-18T00:41:28.624Z" -->
#### Claude
You can — I overstated that. React Native doesn't ship `EventSource` natively, but `react-native-sse` is a well-maintained polyfill that works under Expo's managed workflow with no ejection, so it's a normal JS dependency, not a native-module problem.

The honest tradeoff for *this* app:

**Where SSE is the wrong tool:** the killer feature — "ping me when a lead arrives" — requires the OS waking the app while backgrounded or killed. SSE connections die within seconds of iOS suspending the JS thread. Only APNs/FCM (i.e. Expo Notifications) can do that. So push is non-negotiable regardless.

**Where SSE is genuinely useful:** the owner is *actively looking at* the leads inbox or a site-health page and you want updates to land without a refetch. Live "3 new leads" badges, status transitions reflected without polling.

**Why I leaned away from it for v1** — and where I was wrong to make it absolute:
- Real cost: Workers bill on CPU time and sustained connections add up; you also need a fan-out story (a Durable Object per account, or a pub/sub of some kind) because a Worker request can't easily push events triggered by a different request.
- Polyfill cost: small but non-zero — reconnection on cellular handoff and background→foreground transitions needs explicit handling.
- v1 alternative that costs nothing: TanStack Query already refetches on window/app focus by default. Combined with push waking the app, "feels live" is mostly free.

So the right policy is: SSE is on the table, but it's additive — polling-on-focus + push covers v1, and we add SSE when we have a concrete UX that demands sub-second cross-device sync. Let me fix DOC-12 — that policy item was too absolute.

DOC-12 updated. Policy item #15 now reads as a layered model:

- **Push** is required infrastructure regardless — only push wakes a backgrounded app.
- **Polling-on-focus** (TanStack Query's default) covers v1 for free.
- **SSE is permitted but additive** — RN supports it via `react-native-sse` under Expo managed; the real cost is *server-side fan-out* (a Durable Object per account or pub/sub), not client compatibility. Add when a UX demands it.
- **WebSockets** stay out of v1.x — SSE covers the same use cases more cheaply on Workers.

The takeaway for sequencing: device-registration + push fan-out (item #4 in the upstream list) still lands first because it's needed for the killer feature. SSE becomes a separately-scoped follow-up if/when we want live in-app updates — which means the auth, contracts, and owner-API tickets do not need to assume SSE in their first design.


<!-- xgd-turn id="e035fed6-2bec-4470-a2ae-56551f35730b" -->

<!-- xgd-chat role="user" ts="2026-06-18T00:43:52.863Z" -->
#### You
I think it's only relevant when we're using the app but for the chat feature which I think should exist in the app, it seems like the right solution polling is really clunky. We should use push notifications for out of band updates

<!-- xgd-chat role="assistant" ts="2026-06-18T00:43:52.863Z" -->
#### Claude
You're right and I missed that chat was in scope for mobile. Chat streaming via polling is awful — you either poll every 200ms (wasteful, still clunky) or wait for whole-message completion (kills the perceived-latency win). SSE is the standard answer for AI chat streaming, and it costs us very little here because we already have it: the control-app already runs an SSE multiplex keyed by `session_id` for the builder chat — same primitive, just exposed under owner auth.

That also simplifies the fan-out concern I raised before. Chat SSE is **1:1** (one stream per active session, lives only while the user has the chat screen open), not a fan-out from a write event to every device. No Durable Object or pub/sub needed.

Two quick architectural notes before I update the doc:

1. **Same backend infrastructure as the builder's chat** — same SSE format, same session model, same Worker. The owner-mobile chat just uses a different system prompt and a different tool surface (CRM actions: mark lead status, draft a follow-up email, summarize this week — NOT site-editing tools). Whether that's one `/api/owner/v1/chat` endpoint with a `mode` param or a separate route is a product decision, not an architectural one; both work.
2. **Push covers backgrounded.** When the app is closed and a lead comes in, the OS wakes the app via push. When the user opens the chat to ask "what just happened?", SSE streams the reply. The two are complementary, not alternatives.

Updating DOC-12.

DOC-12 updated. Summary of what changed:

- **Overview** — chat is now in scope, framed as an "AI assistant chat for non-editing tasks" (lead questions, follow-up drafting, activity summaries, CRM actions via natural language). Explicit guardrail: mobile chat's tool surface excludes site-editing.
- **Policy item #15** rewritten as a four-way layered model:
  - Out-of-band events → push
  - In-app chat streaming → SSE (1:1 stream, reuses existing builder SSE infrastructure — no Durable Object needed)
  - List/status freshness → TanStack Query focus-refetch
  - Cross-device live updates → explicitly deferred (this is the only case that would justify the DO/pub-sub cost)
- **New policy item #10a** — `POST /api/owner/v1/chat` (SSE response) reusing existing chat infrastructure with a different system prompt and tool surface. Whether it's a `mode` param or a separate route is a follow-up product call; the architectural commitment is "no parallel chat stack."
- **Upstream worklist** grew from 5 to 6 items — added "Owner chat endpoint with non-builder tool surface" — small layer over existing primitives, ideally lands before the first mobile chat screen.
- **Open questions** gained two new ones (tool-surface partitioning + chat history persistence/cross-device continuity).

The sequencing implication: auth tokenization (item 1) is still the only true blocker. Items 4 (push) and 6 (owner chat endpoint) gate specific mobile features but don't block bootstrapping the mobile app.


<!-- xgd-turn id="e5b0cc03-cc53-4a64-85e6-45609d931829" -->

<!-- xgd-chat role="user" ts="2026-06-18T00:46:32.142Z" -->
#### You
Right, I think these are different use cases if the dashboard is open we can update it using SSE, but that's a completely different news case from "you got another lead!"

<!-- xgd-chat role="assistant" ts="2026-06-18T00:46:32.142Z" -->
#### Claude
Right — that's the sharper framing. They're two different signals through one event channel:

- **Push** = "this thing happened; you should know about it" (app closed/backgrounded)
- **SSE** = "you're already looking at the screen that shows these; let me keep it live" (app open, dashboard active)

The clean way to do this on Cloudflare is a **per-account Durable Object as an event bus**. Writers (form handler, monitoring Worker) signal it once per event; the DO fans out to (a) connected SSE subscribers and (b) Expo push for offline devices. One signal, two delivery channels, no double-implementation. DOs hibernate when idle, so the per-account cost when no one's watching is near-zero.

That also means chat SSE and dashboard SSE are *different* endpoints with different shapes:
- **Chat SSE** — `POST /api/owner/v1/chat`, request-response, 1:1, lives in the request handler, no DO.
- **Dashboard SSE** — `GET /api/owner/v1/events`, subscribe-broadcast, goes through the account DO.

This is a meaningful change to DOC-12 — it adds the account DO as v1 infrastructure (it was previously deferred) and moves the email/push fan-out out of the form handler into the DO so there's a single fan-out point. Updating now.

DOC-12 updated. Summary of what changed in this pass:

- **Item #15 (real-time model)** rewritten as *two delivery paths from one event bus*. Push and dashboard-SSE are no longer competing options — they're complementary surfaces over the same event signal. Chat SSE is called out as a *separate endpoint, separate shape, separate lifecycle* — explicit warning not to conflate them.
- **New item #15a** — `AccountEventBus` per-account Durable Object. Lazy-start, idle-hibernate, broadcasts to SSE subscribers, fans out to Resend + Expo Push. This is now the *single fan-out point* for owner events.
- **Item #12 (form handler)** — no longer calls Resend or Expo Push directly. It signals the account DO with `lead.created`; the DO does the work.
- **Item #13 (Queues)** — still deferred, with updated reasoning (DO handles fan-out, so Queues only matter for cross-account batched delivery).
- **Upstream worklist item #4** — promoted to the largest single item, now reading "Account event-bus DO + device registration + email/push/SSE fan-out." This is the most substantive architectural addition since the original doc. The form-handler change becomes a thin wrapper around `accountDO.signal(event)`.
- **Item #5 (monitoring)** updated to signal the same DO on status transitions — reuses #4's fan-out instead of reinventing.
- **Item #6 (chat)** — explicitly notes chat SSE is *not* routed through the event bus.
- **Two new open questions** — push-during-SSE redundancy in v1, and DO ring-buffer for reconnect gap replay.

The sequencing implication: the upstream worklist is now (1) auth tokenization → (2) api-contracts → (3) owner-API skeleton → (4) **AccountEventBus DO + device-reg + fan-out** → (5) monitoring → (6) owner chat endpoint. Items 1–3 still gate everything; item 4 is now the gate for the first "feels live" feature on either web or mobile.


<!-- xgd-chat-end -->