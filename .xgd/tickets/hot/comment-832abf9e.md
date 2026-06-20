---
uid: comment-832abf9e
id: COMMENT-116
type: comment
title: Comment on chat CHAT-18
created_by: xgd
created_at: '2026-06-20T19:23:39.986463+00:00'
updated_at: '2026-06-20T19:26:10.892458+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  subject_uid: chat-e1d133fa
  kind: chat_transcript
---

<!-- xgd-turn id="47279dc2-167a-42c3-9306-915ae93ead19-user" -->

<!-- xgd-chat role="user" ts="2026-06-20T19:23:19.680Z" -->
#### You
```
[wrangler]  ⛅️ wrangler 3.114.17 (update available 4.103.0)
[wrangler] ----------------------------------------------------------
[wrangler] 
[wrangler] ▲ [WARNING] The version of Wrangler you are using is now out-of-date.
[wrangler] 
[wrangler]   Please update to the latest version to prevent critical errors.
[wrangler]   Run `npm install --save-dev wrangler@4` to update to the latest version.
[wrangler]   After installation, run Wrangler with `npx wrangler`.

```

Are we on this version for a reason? Should we update? (seems like we should be current...)

<!-- xgd-turn id="47279dc2-167a-42c3-9306-915ae93ead19-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-20T19:23:43.317Z" -->
#### Claude
No reason we're pinned — the `^3.80.0` was just what came down when the monorepo was scaffolded (`scaffold: monorepo + two-Worker Cloudflare deploy pipeline` commit). Nothing in our `wrangler.toml`s or commits depends on v3-specific behavior.

Recommendation: yes, update to v4. The main thing to watch is wrangler v4's stricter config validation — it deprecated some legacy keys and tightened bindings syntax — so the bump should be: update the three `package.json`s, run `wrangler dev` and `wrangler deploy --dry-run` for both apps, fix any complaints, commit.

Want me to do it under CHAT-18's scope (this is a tooling/dep bump, no production code changes — config-only, so per the free-coding rules it doesn't strictly need a ticket, but I can roll it into CHAT-18 if you want it tracked)?

<!-- xgd-turn id="c03ad584-d61d-411d-92b6-43288daf56cc-user" -->

<!-- xgd-chat role="user" ts="2026-06-20T19:24:08.091Z" -->
#### You
PLease do the update

<!-- xgd-chat-end -->