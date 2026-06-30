---
uid: comment-52dc9a8a
id: COMMENT-291
type: comment
title: Comment on bug BUG-23
created_by: xgd
created_at: '2026-06-30T00:44:20.087025+00:00'
updated_at: '2026-06-30T00:46:40.113808+00:00'
completed_at: null
last_field_updated: body
status: null
fields:
  subject_uid: bug-f75d186f
  kind: chat_transcript
---

<!-- xgd-turn id="39a7142c-e63c-4b1c-bcf5-773a37627fb3-user" -->

<!-- xgd-chat role="user" ts="2026-06-30T00:44:01.526Z" -->
#### You
The following is a transcript from the web builder - pleasse help me understand what is going on:

Let me know how you'd like to proceed!

✗analyze_page — rejected

safeFetch failed: disallowed_scheme — http_not_allowed

✗transcribe_site — rejected

handler threw: Error: Network connection lost.

[system] The previous turn produced 2 failed tool calls. Review the errors and retry where appropriate: - analyze_page({"url":"http://gigabytealchemy.ai"}) → safeFetch failed: disallowed_scheme — http_not_allowed - transcribe_site({"digestId":"https://gigabytealchemy.ai"}) → handler threw: Error: Network connection lost.

Try https://gigabytealchemy.ai/

I'm running into a technical snag — the analyzer is hitting an internal caching error that's preventing the page from being fetched and stored. This appears to be a platform-side bug rather than an issue with the URL itself.

Here's what I'd suggest:

1. **Try again in a moment** — the caching issue may be transient.
2. **Describe the site to me** — if you know what's on gigabytealchemy.ai (colors, sections, content), I can build a close replica from your description right now.
3. **Share a screenshot** — if you paste a screenshot or describe the layout, I can reconstruct it section by section.

Would you like me to file a bug ticket for the caching error, or would you prefer to describe the site so I can build it manually?

✗analyze_page — rejected

handler threw: Error: KV PUT failed: 400 Invalid expiration_ttl of 13. Expiration TTL must be at least 60.

✗transcribe_site — rejected

digest_not_found: no digest record for https://gigabytealchemy.ai/ — run analyze_page first

<!-- xgd-turn id="39a7142c-e63c-4b1c-bcf5-773a37627fb3-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-30T00:46:40.079Z" -->
#### Claude
I'll dig into the codebase to diagnose this rather than guess. Let me trace the errors.

While that investigation runs, here's what the transcript is telling us. There are actually **four distinct failures**, and they cascade:

**1. `analyze_page` → `disallowed_scheme — http_not_allowed`**
You (or the AI) passed `http://gigabytealchemy.ai`. The web-fetch safety contract (DOC-9 §11 / REQ-20) is HTTPS-only by design — plain `http://` is rejected as an SSRF/abuse guard. This one is *working as intended*. The fix is exactly what was suggested: use `https://`.

**2. `transcribe_site({"digestId":"https://gigabytealchemy.ai"})` → `Network connection lost`**
This call is also malformed: `transcribe_site` expects a **digest id** produced by a prior successful `analyze_page`, not a URL. The AI fed it the URL. "Network connection lost" is a transient Workers-side blip on top of that.

**3. `analyze_page("https://…/")` → `KV PUT failed: 400 Invalid expiration_ttl of 13. Expiration TTL must be at least 60.`** ← **this is the real bug**
The fetch itself worked, but when the handler tried to write the digest/response into the KV cache, it passed an `expirationTtl` of **13 seconds**. Cloudflare KV enforces a **60-second minimum**, so the write is rejected and the whole `analyze_page` call fails. Notably, the builder AI's guess that this is "a platform-side caching bug, not the URL" was actually correct.

**4. `transcribe_site` → `digest_not_found … run analyze_page first`**
Pure downstream consequence of #3: because the KV write failed, no digest record was ever stored, so transcribe has nothing to read.

So #1 and #2 are input/usage errors (wrong scheme, wrong argument), and #4 is just a symptom. The thing actually worth fixing is **#3: a TTL of 13 reaching a KV `.put()`** when it should be ~3600s (response cache) or ~86400s (digest record) per REQ-20/REQ-21. That value of 13 strongly smells like a computed TTL bug — e.g. `expiry - now` where the expiry is nearly current, or a ms/seconds unit slip.

Let me confirm the exact source line.

Confirmed. Let me read the exact code so I can show you precisely.

Root cause confirmed. Here's the complete picture.

## What's going on

The four errors in your transcript are three different things stacked up:

| # | Tool call | Error | Verdict |
|---|-----------|-------|---------|
| 1 | `analyze_page("http://…")` | `disallowed_scheme` | **Working as intended** — HTTPS-only safety guard. User error: use `https://`. |
| 2 | `transcribe_site("https://…")` | `Network connection lost` | **Misuse + transient** — `transcribe_site` wants a *digest id*, not a URL; got a transient Workers blip too. |
| 3 | `analyze_page("https://…/")` | `KV PUT failed: Invalid expiration_ttl of 13` | **The real bug.** |
| 4 | `transcribe_site` | `digest_not_found` | **Symptom of #3** — digest never got stored because #3 threw. |

## The actual bug

It is *not* in the digest-caching code (that correctly uses 86400s). It's in the **rate-limit guard** that runs on every fetch, in `packages/web-fetch-safety`:

`rate-limit.ts:54`
```ts
const ttl = Math.max(1, window.resetsAt - now + 5);
await kv.put(key, JSON.stringify(window), { expirationTtl: ttl });
```

The TTL for the rate-limit window record is computed as *time remaining in the window* (`resetsAt - now`) plus a 5s pad. When you call `analyze_page` and the rolling window happens to be near its end — about 8 seconds left — `ttl = 8 + 5 = 13`. Cloudflare KV enforces a **60-second floor**, rejects the write with `Invalid expiration_ttl of 13`, and the exception propagates all the way up, killing `analyze_page`. Then transcribe has no digest to read (#4).

The `Math.max(1, …)` floor is the giveaway — `1` was never a legal KV TTL; it should be `60`. The identical pattern exists in two sibling files:

- `rate-limit.ts:54` — `Math.max(1, window.resetsAt - now + 5)` ← the one your transcript hit
- `browser-budget.ts:56` — `Math.max(1, counter.resetsAt - now + 5)` ← same bug, browser-rendering budget counter
- `intent-token.ts:65` — `Math.max(1, ttl)` ← latent; only bites if a caller passes `ttlSeconds < 60`

**The fix is a one-character-class change in three spots: `Math.max(1, …)` → `Math.max(60, …)`.** That clamps every TTL to KV's legal minimum without changing the intended expiry semantics.

This is a real, shippable bug fix and you're in a session scoped to **BUG-23** (currently blank). I'd suggest we use it: I'll populate the BUG-23 body with the symptom/root-cause/fix above, then free-code the three-line fix with a UAT (`test_UAT_FC_BUG-23_*`) that asserts the rate-limit/budget writes never emit a sub-60 TTL.

Want me to (a) draft the BUG-23 ticket body now, then (b) implement the fix? Or just draft the ticket and hold on the code?

<!-- xgd-chat-end -->