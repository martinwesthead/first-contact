---
uid: comment-f09cba9a
id: COMMENT-110
type: comment
title: Comment on bug BUG-6
created_by: xgd
created_at: '2026-06-19T23:51:24.086361+00:00'
updated_at: '2026-06-19T23:51:24.086361+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  subject_uid: bug-bf15661c
  kind: chat_transcript
---

<!-- xgd-turn id="edcee64f-ae06-4ec4-8e80-fac47f878ec3-user" -->

<!-- xgd-chat role="user" ts="2026-06-19T23:51:06.361Z" -->
#### You
pnpm dev just failed:

```
((.venv-working) ) martin@nyx control-app % pnpm dev 

> @1stcontact/control-app@0.0.2 dev /Users/martin/Projects/first-contact/apps/control-app
> wrangler dev --port 8788

 ⛅️ wrangler 3.114.17 (update available 4.103.0)
----------------------------------------------------------

▲ [WARNING] The version of Wrangler you are using is now out-of-date.

  Please update to the latest version to prevent critical errors.
  Run `npm install --save-dev wrangler@4` to update to the latest version.
  After installation, run Wrangler with `npx wrangler`.

Using vars defined in .dev.vars
Your Worker and resources are simulated locally via Miniflare. For more information, see: https://developers.cloudflare.com/workers/testing/local-development.

Your worker has access to the following bindings:
- KV Namespaces:
  - FETCH_RATE_KV: placeholder_fetch_rate_kv [simulated locally]
  - FETCH_CACHE_KV: placeholder_fetch_cache_kv [simulated locally]
  - FETCH_ROBOTS_KV: placeholder_fetch_robots_kv [simulated locally]
  - BROWSER_BUDGET_KV: placeholder_browser_budget_kv [simulated locally]
- R2 Buckets:
  - ASSETS_BUCKET: 1stcontact-assets [simulated locally]
- Vars:
  - CLAUDE_API_KEY: "(hidden)"
⎔ Starting local server...
[wrangler:inf] Ready on http://localhost:8788
[wrangler:inf] GET / 200 OK (12ms)
[wrangler:inf] GET /builder 304 Not Modified (5ms)
[wrangler:inf] GET /_assets/builder.js 304 Not Modified (2ms)
[wrangler:inf] GET /starter-sites/1stcontact.json 304 Not Modified (2ms)
[wrangler:inf] GET / 200 OK (2ms)
[wrangler:inf] GET /builder 304 Not Modified (2ms)
[wrangler:inf] GET /_assets/builder.js 304 Not Modified (2ms)
[wrangler:inf] GET /starter-sites/1stcontact.json 304 Not Modified (2ms)
[wrangler:inf] GET / 200 OK (1ms)
[wrangler:inf] GET /builder 304 Not Modified (1ms)
[wrangler:inf] GET /_assets/builder.js 304 Not Modified (1ms)
[wrangler:inf] GET /starter-sites/1stcontact.json 304 Not Modified (1ms)
[wrangler:inf] GET /builder 304 Not Modified (2ms)
[wrangler:inf] GET /_assets/builder.js 304 Not Modified (1ms)
[wrangler:inf] GET /starter-sites/1stcontact.json 304 Not Modified (1ms)
[wrangler:inf] GET /builder 304 Not Modified (2ms)
[wrangler:inf] GET /_assets/builder.js 304 Not Modified (2ms)
[wrangler:inf] GET /starter-sites/1stcontact.json 304 Not Modified (2ms)
⎔ Reloading local server...
⎔ Reloading local server...
⎔ Reloading local server...
⎔ Reloading local server...
⎔ Reloading local server...
╭──────────────────────────────────────────────────────────────────────────────────────────────────╮
│  [b] open a browser, [d] open devtools, [l] turn off local mode, [c] clear console, [x] to exit  │
╰──────────────────────────────────────────────────────────────────────────────────────────────────╯
Error: ENOENT: no such file or directory, utime '/Users/martin/Library/Preferences/.wrangler/registry/1stcontact-control-app'
    at utimesSync (node:fs:2186:11)
    at Timeout._onTimeout (/Users/martin/Projects/first-contact/node_modules/.pnpm/wrangler@3.114.17_@cloudflare+workers-types@4.20260612.1/node_modules/wrangler/wrangler-dist/cli.js:155543:39)
    at listOnTimeout (node:internal/timers:608:17)
    at process.processTimers (node:internal/timers:543:7) {
  errno: -2,
  code: 'ENOENT',
  syscall: 'utime',
  path: '/Users/martin/Library/Preferences/.wrangler/registry/1stcontact-control-app'
}
 ELIFECYCLE  Command failed with exit code 1.
((.venv-working) ) martin@nyx control-app %

```

<!-- xgd-chat-end -->