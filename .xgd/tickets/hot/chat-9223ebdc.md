---
uid: chat-9223ebdc
id: CHAT-7
type: chat
title: 2026-06-12 13:22
created_by: xgd
created_at: '2026-06-12T20:22:20.310796+00:00'
updated_at: '2026-06-12T20:23:36.552583+00:00'
completed_at: null
last_field_updated: body
status: open
fields: {}
---

<!-- xgd-turn id="3738e3f3-24a0-4383-8f1c-d071e17a19bf" -->

<!-- xgd-chat role="user" ts="2026-06-12T20:23:36.514Z" -->
#### You
Please read DOC-4 and DOC-5 - in this conversation I would like us to discuss the web framework. Lets start by discussing requirements.

We want something reasonably generic that can support all kinds of small business website structures. Our goal is to build one set of Javascript and probably HTML and have the AI tool apply custom CSS and content. What are your thoughts?

<!-- xgd-chat role="assistant" ts="2026-06-12T20:23:36.514Z" -->
#### Claude
I've read both. Here's my take on the framework shape.

## The core idea is right, but "one HTML" should be "one section library"

The architecture doc already commits to this in principle (section renderers + theme tokens + content), and your framing tightens it nicely. The thing to get clear is **what unit is reused**.

I'd suggest three layers:

**1. Section library — fixed HTML + JS (shared, versioned, evolves for all)**
- ~20–40 section types: hero, services-grid, testimonials, gallery, contact-form, about, pricing/menu, FAQ, hours, location, CTA band, logo strip, booking-link, before/after, etc.
- Each section has stable semantic HTML, ARIA, and any behavior (lightbox, carousel, form submit, mobile nav). Progressive enhancement: content works without JS.
- Sections are composable on a page; pages are just ordered lists of section instances.
- **This is your "one set of JS and HTML."** Not literally one HTML file — one library of section components.

**2. Theme tokens — per-site CSS variables (AI-controlled, structured)**
- Palette, type scale, spacing scale, radius, shadow, container width, breakpoints — a few dozen tokens total.
- Site CSS is *generated* from tokens, not written. AI sets tokens; it never writes raw CSS rules. This is the architecture doc's "structured changes" principle applied to styling.
- Section-level variants (compact/spacious, bordered, light/dark surface) are also token-driven booleans/enums, not custom CSS.

**3. Content — per-site (AI-curated, user-edited)**
- Site config, page composition (which sections in what order), per-section copy/images/lists, form definitions, SEO metadata.

## Why "AI writes custom CSS" is the part I'd push back on

The doc explicitly bounds AI to structured changes for cost, risk, and validation reasons. Letting AI write arbitrary CSS reopens all three:
- Visual regressions become unboundedly hard to validate.
- Per-site CSS divergence makes shared framework updates unsafe.
- Token budget per change balloons.

The win comes from making the **token surface rich enough** that token-only edits produce visually distinct sites. With a good palette/type/spacing system plus section variants, "modern minimal", "warm artisan", "bold premium", and "classic professional" looks are all reachable without touching CSS.

## The main tradeoff

You give up per-site layout creativity. Some customers will ask for things the section library doesn't do. The discipline has to be: **new need → new section type in the shared library**, never a per-site fork. That keeps the maintenance story sane but means saying "no, but soon" to genuinely novel requests.

## Questions worth pinning down before we go deeper

1. **Industry differentiation** — do you want vertical-specific section types (a "menu" section for caterers, a "portfolio" for photographers), or generic-section + content (a "grid" section that holds either menu items or portfolio pieces)? Affects library size vs. AI's job at composition time.
2. **JS delivery model** — single shared bundle on every page, or per-section JS modules tree-shaken at build time? Matters for page-weight on simple sites.
3. **How rigid is the page skeleton?** — is "header + sections + footer" the only shape, or do we need full-bleed landing pages, side-rail layouts, etc.? Drives whether layouts are another token or another concept entirely.
4. **First vertical** — DOC-5 flags this as an open question. Picking one (caterer, coach, photographer, tradesperson) shapes which sections we build first and what "good" looks like for the MVP.

Where would you like to start — section taxonomy, theme-token surface, or first-vertical choice?


<!-- xgd-chat-end -->