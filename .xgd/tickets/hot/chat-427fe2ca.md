---
uid: chat-427fe2ca
id: CHAT-5
type: chat
title: Website Framework (1)
created_by: xgd
created_at: '2026-06-12T20:18:41.828459+00:00'
updated_at: '2026-06-12T20:20:05.393583+00:00'
completed_at: null
last_field_updated: body
status: open
fields: {}
---

<!-- xgd-turn id="2da82803-121e-4f38-aeee-bce00b3d1d78" -->

<!-- xgd-chat role="user" ts="2026-06-12T20:20:05.352Z" -->
#### You
Please read DOC-4 and DOC-5 - in this conversation I would like us to discuss the web framework. Lets start by discussing requirements.

We want something reasonably generic that can support all kinds of small business website structures. Our goal is to build one set of Javascript and probably HTML and have the AI tool apply custom CSS and content. What are your thoughts?

<!-- xgd-chat role="assistant" ts="2026-06-12T20:20:05.352Z" -->
#### Claude
I've read both DOC-4 and DOC-5. Here are my thoughts on the framework requirements.

## The core instinct is right — with one important refinement

"One shell, content + theme per site" is exactly the right shape for an AI-stewarded, $50/month platform. It collapses the maintenance surface, makes AI changes low-risk (no generated HTML/JS to validate), and aligns with the JAMstack + Cloudflare commitments in DOC-5.

**But "one HTML + one JS + CSS-only customization" alone won't carry the load.** Pure CSS reskinning can change color, type, spacing, and even some layout (via flex/grid order), but it cannot reshape DOM into genuinely different artifacts — a photographer's portfolio grid, a caterer's menu, a coach's booking form, a tradesperson's service list need different *markup and behavior*, not just different colors. If you force one HTML, the sites will visibly feel like siblings — which is a problem for "stop worrying about your website" if every customer notices their competitor has the same skeleton.

**The refinement that makes it work**: one shell + a **curated catalog of section components**. The shell (page chrome, layout system, navigation, head/SEO, form wiring, JS runtime) is genuinely single-implementation. Per-page content is an ordered list of *typed sections* drawn from a finite catalog — Hero, FeatureGrid, Gallery, Menu, BookingCTA, Testimonials, Pricing, FAQ, ContactForm, etc. Each section has its own HTML/JS but is *also* part of the shared codebase — no per-site code. Customization happens at two layers: **theme tokens** (CSS variables driving the whole site) and **section config + content** (what each instance shows).

This matches DOC-5's "Shared Framework: Layouts, Components, Section renderers" — but it's worth being explicit, because it changes what "one set of JS+HTML" means in practice.

## The requirement areas I'd like to work through

Roughly in order of how much they'll shape the rest:

1. **Section catalog scope** — what sections ship at MVP, and how broad each one is. A `Gallery` with variants (grid/masonry/carousel) vs three separate sections is a real choice.
2. **Theme token system** — the design tokens AI is allowed to touch (palette, type scale, spacing scale, radius, shadow). Plus a few discrete "feel" presets (minimal / warm / premium / bold) that bundle compatible token sets, since "make it feel premium" is a real ask.
3. **Page composition model** — page = header + ordered sections + footer? Multi-page nav. URL/slug rules. Per-page SEO metadata.
4. **JS scope and progressive enhancement** — what does JS actually do (forms, lightbox, mobile nav, small interactivity)? Hard limit on JS bundle size? No SPA framework.
5. **Asset pipeline** — responsive image variants (srcset), R2 origin, lazy loading. AI uploads originals, framework derives sizes.
6. **Form/lead wiring** — form sections post to Worker endpoints; configuration determines fields and routing into the D1 lead record.
7. **Industry verticals** — DOC-4 says "industry templates at the workflow level, not visual level." I read that as: caterer/coach/photographer share the same shell and section catalog, but ship with different *default page templates* (preconfigured section lists + starter content) and different *CRM/form wiring* (e.g., catering inquiries need event date + guest count).
8. **Rendering strategy** — build-time static generation (renderer → HTML in R2 → Workers Static Assets) vs edge-rendered. I'd default to build-time; aligns with JAMstack and matches DOC-5's pipeline diagram.
9. **Accessibility & responsive guarantees** — the shell enforces these once; sections must pass an a11y/responsive contract to enter the catalog.
10. **Preview & revision integration** — every config change → new revision → renderable preview → publish. This ties into DOC-5's revision model.

**My recommendation for where to start**: nail down the section catalog scope and the theme token model first. Those two together define what AI can actually do, and everything else (forms, assets, vertical templates) hangs off them.

Want to start with the section catalog, or with the theme/token model? Or push back on the "section catalog" framing if you had a tighter "purely CSS-skinned" vision in mind?


<!-- xgd-chat-end -->