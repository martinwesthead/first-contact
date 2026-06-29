---
uid: comment-9ea07ee4
id: COMMENT-273
type: comment
title: Comment on bug BUG-2
created_by: xgd
created_at: '2026-06-29T20:46:00.428143+00:00'
updated_at: '2026-06-29T20:46:00.428143+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  subject_uid: bug-134c0e26
  kind: chat_transcript
---

<!-- xgd-turn id="5cf4d518-2a80-4e21-8d72-9a83bcffb1fc-user" -->

<!-- xgd-chat role="user" ts="2026-06-29T20:45:52.159Z" -->
#### You
```
((.venv-working) ) martin@nyx control-app % pnpm dev       

> @gendev/control-app@0.0.2 dev /Users/martin/Projects/first-contact/apps/control-app
> concurrently -k -n bundle,wrangler,sidecar -c yellow,magenta,cyan "pnpm build:bundle:watch" "wrangler dev --port 8788" "node ../../tools/dev-tools-server/bin/start.mjs"

node:internal/modules/cjs/loader:1408
  throw err;
  ^

Error: Cannot find module '/Users/martin/Projects/first-contact/node_modules/concurrently/dist/bin/concurrently.js'
    at Module._resolveFilename (node:internal/modules/cjs/loader:1405:15)
    at defaultResolveImpl (node:internal/modules/cjs/loader:1061:19)
    at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1066:22)
    at Module._load (node:internal/modules/cjs/loader:1215:37)
    at TracingChannel.traceSync (node:diagnostics_channel:322:14)
    at wrapModuleLoad (node:internal/modules/cjs/loader:235:24)
    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:152:5)
    at node:internal/main/run_main_module:33:47 {
  code: 'MODULE_NOT_FOUND',
  requireStack: []
}

Node.js v24.2.0
 ELIFECYCLE  Command failed with exit code 1.
((.venv-working) ) martin@nyx control-app %

```

I am having difficulty starting the server

<!-- xgd-chat-end -->