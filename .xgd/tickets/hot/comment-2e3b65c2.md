---
uid: comment-2e3b65c2
id: COMMENT-4
type: comment
title: Comment on request REQ-6
created_by: xgd
created_at: '2026-06-12T23:30:38.125738+00:00'
updated_at: '2026-06-13T18:52:06.804444+00:00'
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

<!-- xgd-turn id="22c0e7b9-fa18-4783-a851-7140b36fd44f-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-13T17:27:11.800Z" -->
#### Claude
I have enough context. Let me plan the implementation and start work.

Now let me build the framework's fonts shortlist first, then the generator, site definition, public-site wiring, workflows, and tests.

### 1. Vetted Google Fonts shortlist

### 2. Generator package

### 3. Site definition

Now create the placeholder asset (1x1 transparent PNG) and update the README.

### 4. Wire `apps/public-site`

Now add `public/` to gitignore for the public-site (generated output).

### 5. Update workflows to run generate before deploy

### 6. Install new dependencies

The site definition has nested objects (nav entries, CTAs, items, form fields) but `ContentValue` only admits string/AssetRef/array. Since the module metas declare object content fields, this needs to be widened in the schema — a small fix in service of REQ-6 wiring up the modules.

The HTML renders but module-scoped CSS isn't bundled by `astro/container` — only the theme tokens are in the CSS file. Let me extract module `<style>` content into the bundle so the site is actually styled.

Now wire module styles into the generator output:

Module CSS is bundled. Now the tests.

### 7. Write UAT tests

Now the public-site Worker tests. These need a built `public/` directory and use `wrangler.unstable_dev`.

Let me run the full REQ-6 test suite:

All 4 generator tests pass. Now the worker + workflow tests.

All worker + form tests pass. Now run the full repo test suite to check for any regressions.

The REQ-1 placeholder test asserted `"Hello from 1stcontact.io"` — REQ-6 replaces that placeholder with the real marketing site, which is the point. The test is obsolete by design.

All 98 tests pass. Now run the build and dry-run deploys to make sure CI will pass.

Now fix the Dirent typing in load.ts and the framework build also can't import the .astro for the existing types:

All builds pass. Let me run the dry-run deploys too.

Dry-run succeeds. Quick verification of the site contents in browser-style.

Let me run the entire suite once more as a final check.

All 98 tests pass, build clean, dry-run deploy clean.

### Final check — update the ticket body and commit

Good — the generated output is ignored. Now update the ticket body to reflect what landed, then commit.

Now commit the changes.

REQ-6 is `free_coded` and parked at the stable resting state.

## Summary

`tools/generate` ships as an Astro-Container-backed CLI (`fc-generate`) that loads + validates a site definition, renders each module instance into anchored sections, bundles theme tokens + extracted module `<style>` blocks into `theme.css`, copies assets, and emits `<head>` with Google Fonts preload links derived from the vetted shortlist in `packages/framework/src/tokens/fonts.ts`. The real `sites/1stcontact/site.json` (header / hero / how-it-works / services-grid / about / contact / footer) is authored end-to-end with copy ready for operator polish. `apps/public-site` now serves the generated output via Workers Static Assets and exposes the stub `POST /api/forms/contact` (JSON content-type required, honeypot silently dropped) ahead of REQ-7. CI + deploy workflows generate before deploying.

One incidental schema widening was needed: `ContentValue` in `@1stcontact/site-schema` previously didn't admit plain objects, which the Phase 0 module catalog requires for nav entries, CTAs, services-grid items, and form fields. Widened to include `{[k]: ContentValue}`. The REQ-1 placeholder UAT was deleted (REQ-6 replaces the placeholder it asserted).

98 tests / 53 files pass; full build is clean; `wrangler deploy --dry-run` succeeds. Ticket `REQ-6` is at `free_coded` with `commits=[bce23fdc...]` and `story_points=5`. Promotion to `ready_to_reconcile` is your call when you're ready.

<!-- xgd-turn id="03ff3923-1e7b-486c-ad74-9e7da8d33c17-user" -->

<!-- xgd-chat role="user" ts="2026-06-13T18:51:58.451Z" -->
#### You
At this point is there anything observable that I could test/see

<!-- xgd-chat-end -->