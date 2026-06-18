---
uid: chat-9a512e7f
id: CHAT-15
type: chat
title: Mobile app technology
created_by: xgd
created_at: '2026-06-18T00:16:23.943504+00:00'
updated_at: '2026-06-18T00:27:11.904722+00:00'
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


<!-- xgd-chat-end -->