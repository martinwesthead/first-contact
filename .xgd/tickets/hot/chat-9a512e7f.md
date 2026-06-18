---
uid: chat-9a512e7f
id: CHAT-15
type: chat
title: Mobile app technology
created_by: xgd
created_at: '2026-06-18T00:16:23.943504+00:00'
updated_at: '2026-06-18T00:20:36.021093+00:00'
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


<!-- xgd-chat-end -->