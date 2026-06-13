---
uid: comment-2e3b65c2
id: COMMENT-4
type: comment
title: Comment on request REQ-6
created_by: xgd
created_at: '2026-06-12T23:30:38.125738+00:00'
updated_at: '2026-06-13T17:13:48.975016+00:00'
completed_at: null
last_field_updated: body
status: null
fields:
  subject_uid: request-aaf6b75c
  kind: chat_transcript
---

*Captured from dashboard chat CHAT-7 (chat-9223ebdc) — paraphrased excerpts of the design discussion specifically relevant to this ticket. Full session transcript lives on CHAT-7.*

<!-- xgd-chat role="user" ts="2026-06-12T22:00:00.000Z" -->
#### You

The repo contains the first-contact app and associated web pages. This is what a customer sees when they come to our site. All this content will be in git and maintained on github. As far as possible it should use the same constraints and framework for display as customer sites. Customer sites will be stored in D1 and created with FC.

<!-- xgd-chat role="assistant" ts="2026-06-12T22:05:00.000Z" -->
#### Claude

Two consumption paths, one framework:

| Path | Site definition source | Use |
|---|---|---|
| File-backed | JSON files under `sites/<name>/` in the repo | 1st Contact's own marketing site; showcase sites |
| D1-backed | Records in the D1 product database | All customer sites |

The renderer accepts either source via a common interface. Module rendering is identical — no divergent code paths. The file-backed path is the FC marketing site; the D1-backed path is customer sites built by AI.

**Repo (aligned with REQ-1's actual scaffold):**

```
1stcontact/
├── apps/
│   ├── public-site/      Worker for 1stcontact.io (marketing site + public endpoints)
│   └── control-app/      Worker for app.1stcontact.io (builder/portal + authenticated endpoints)
├── packages/
│   ├── framework/        Modules, tokens, layout primitives
│   ├── site-schema/      Types + validator
│   ├── builder-ui/       React components for chat builder + portal
│   └── ui-kit/           Shared design-system (shadcn-based)
├── sites/
│   └── 1stcontact/       FC marketing site definition (file-backed)
├── tools/
│   └── generate/         Static generator: site-def → static output
└── db/migrations/        D1 migrations
```

`tools/generate` is the only component that knows whether a site definition came from a file or D1.

<!-- xgd-chat role="user" ts="2026-06-12T22:35:00.000Z" -->
#### You

Lets talk about those design decisions [for Phase 0].

<!-- xgd-chat role="assistant" ts="2026-06-12T22:40:00.000Z" -->
#### Claude

Three remaining choices for the REQ — Phase 0 pricing, fonts, domain.

**Pricing on the FC marketing site:** my recommendation is just an early-access CTA. No pricing numbers shown. Single CTA — "Join early access" or "Get notified." Keeps launch lean; no premature commitments while the product is forming. The alternative (one tier with "coming soon") sets expectations but commits to a number.

**Font selection model:** vetted Google Fonts shortlist — ~8 display + 6 body fonts known to pair well. AI picks from this set. Safer than opening up to all Google Fonts (which would let AI pick poor pairings and risk visual incoherence across the platform). A shortlist is a framework iteration, not a per-site choice.

Proposed shortlist:
- Display: Inter, Manrope, Fraunces, Playfair Display, Space Grotesk, DM Serif Display, Outfit, Sora
- Body: Inter, Source Sans 3, IBM Plex Sans, Lora, Merriweather, Work Sans

**Domain:** gendevlabs.com canonical was my initial lean, but REQ-2 reveals the domain is **1stcontact.io** — registered and the repo renamed to match. So no live domain decision needed at this point; the scaffold already routes `public-site` to `1stcontact.io/*` and `control-app` to `app.1stcontact.io/*`.

<!-- xgd-chat role="user" ts="2026-06-12T22:55:00.000Z" -->
#### You

Ok please create these REQs.

<!-- xgd-chat role="assistant" ts="2026-06-12T23:00:00.000Z" -->
#### Claude

Generator scope (this ticket):

- `tools/generate` is file-backed only in v1. D1-backed path is a later REQ.
- Validates site-def against `@1stcontact/site-schema` (REQ-3).
- For each page: resolves module instances via the framework's registry, renders the page as a composed Astro component, generates per-site CSS via `generateThemeCss`, emits `<head>` with SEO metadata + font preloads + generated-CSS link, writes static output.
- `sites/1stcontact/site.json` — real definition with the 6-module marketing page; copy fields tagged "TBD with operator" where needed.
- `apps/public-site/src/index.ts` — replace placeholder. Serve generated assets via Workers Static Assets binding. Add stub `POST /api/forms/contact` returning `{success:true}` (honeypot rejected silently as 200). Real handler in REQ-7.
- Update `.github/workflows/deploy.yml` to run `tools/generate` before `wrangler deploy` for `public-site`.

Operator follow-ups (no code): finalize hero/manifesto/services/founder-note copy, provide real assets, confirm SEO metadata + og:image.

<!-- xgd-turn id="22c0e7b9-fa18-4783-a851-7140b36fd44f-user" -->

<!-- xgd-chat role="user" ts="2026-06-13T17:09:07.427Z" -->
#### You
Please free code this?

<!-- xgd-chat-end -->