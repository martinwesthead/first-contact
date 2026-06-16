---
uid: chat-bed1a068
id: CHAT-13
type: chat
title: AI Web Access
created_by: xgd
created_at: '2026-06-16T21:56:33.168906+00:00'
updated_at: '2026-06-16T22:02:14.006834+00:00'
completed_at: null
last_field_updated: body
status: open
fields: {}
---

<!-- xgd-turn id="824ee5ba-6707-410d-9a9e-2cec4629d03f" -->

<!-- xgd-chat role="user" ts="2026-06-16T22:02:13.948Z" -->
#### You
I see several use cases for having our AI be able to access websites:
- User has an existing site they want to convert to 1st contact and update
- User wants a site that looks a bit like <competitor> or <adjacency>
- User has links to assets for the site

I think there is a need for a get page / crawl site tool. Let's discuss the requirements and possible solutions, I assume there are high-quality JS libraries for something like this?

<!-- xgd-chat role="assistant" ts="2026-06-16T22:02:13.948Z" -->
#### Claude
Good shape to think about now — this overlaps neatly with the asset pipeline and the AI tool surface in [[DOC-8]]. Quick read before we commit to anything:

## Three capability tiers (different cost/complexity)

| Tier | Capability | Cost | Tool |
|---|---|---|---|
| **1. Static fetch + parse** | URL → HTML → extract OG/meta, title, description, hero image, link graph, basic palette from inline CSS | cheap (Worker `fetch` only) | `linkedon` or `cheerio` + a Readability port |
| **2. JS-rendered fetch** | Modern SPA sites, computed styles, full DOM after hydration, screenshots | per-browser-minute | **Cloudflare Browser Rendering** (`@cloudflare/puppeteer`) |
| **3. Crawl** | N pages from one origin under depth/breadth caps, dedup, sitemap-aware | adds queue + politeness | Tier 1 or 2 + a small BFS in a Worker, results staged through Queues |

## Cloudflare-native is the obvious answer

Browser Rendering ([Cloudflare docs](https://developers.cloudflare.com/browser-rendering/)) is the architecturally-aligned choice given [DOC-5]: same Worker substrate, no new infra, Puppeteer API. Pair it with a static-fetch fast path so we don't burn browser minutes on simple OG-tag scraping. Both run from `apps/control-app` as authenticated endpoints behind the AI tool surface — never exposed publicly.

## The interesting design questions

1. **What does the AI actually need extracted?** Three different shapes for the three use cases:
   - *Convert*: structured content (headings, sections, images) → mapped to module instances
   - *"Looks like X"*: palette, type family, density signals → mapped to theme tokens
   - *Asset link*: just the image bytes → R2

   These are three different output schemas, and conflating them in one tool means a bloated return value.

2. **Tool surface granularity.** One `fetch_url` tool that returns everything, or `extract_palette`, `extract_content`, `fetch_asset` as separate AI tools? I'd lean separate — keeps each call cheap and the AI's intent legible (mirrors [[DOC-8]] §5).

3. **Where extraction logic lives.** A reusable `packages/extractor` (browser-callable, like the renderer per [[DOC-7]] §2.4)? Or Worker-only? If the builder ever wants to preview "your site, but themed like example.com" without persisting, browser-side matters.

4. **Safety boundary.** SSRF (private IPs, file://, etc.), redirect cap, response size cap, robots.txt respect, per-customer rate limit. None hard, but all must be in the contract.

5. **Caching.** Same URL fetched twice in a session should hit a cache; same competitor referenced across sessions probably shouldn't (freshness). KV with short TTL is the natural fit per the [DOC-5] §6 policy.

## Open questions for you

- Are all three use cases in v1 scope, or does "convert existing site" come later?
- Crawl or single-page only at first? (Crawl adds queue + politeness machinery; single-page covers cases 2 and 3 entirely.)
- Should the AI ever fetch on its own initiative, or only when the operator hands it a URL? (Affects budget controls.)

Once we agree on scope I'll write up a scope ticket and we can dig into the schema for whichever extractor(s) you want first.


<!-- xgd-chat-end -->