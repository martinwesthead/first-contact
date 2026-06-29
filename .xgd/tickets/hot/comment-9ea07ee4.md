---
uid: comment-9ea07ee4
id: COMMENT-273
type: comment
title: Comment on bug BUG-2
created_by: xgd
created_at: '2026-06-29T20:46:00.428143+00:00'
updated_at: '2026-06-29T20:49:30.169904+00:00'
completed_at: null
last_field_updated: body
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

<!-- xgd-turn id="5cf4d518-2a80-4e21-8d72-9a83bcffb1fc-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-29T20:46:45.463Z" -->
#### Claude
Let me investigate — this looks like a missing-dependency issue rather than a code problem.

`concurrently` exists at the root but the error references a specific file inside it. Let me check whether that file actually exists — this smells like a broken/partial install (the symlink resolves but the package contents are incomplete).

Found the root cause. The `node_modules/concurrently` symlink points into an **ephemeral reconcile worktree's** pnpm store that has since been cleaned up:

```
node_modules/concurrently -> ../../../.xgd/worktrees/.../reconcile-BUNDLE-5/node_modules/.pnpm/concurrently@9.2.1/...
```

That worktree is gone, so the symlink dangles. This matches a known issue in my memory (reconcile/regression worktrees stealing node_modules links). The fix is to relink against the local store with `pnpm install`.

Confirmed — the entire worktrees directory is gone, so that symlink (and likely others) is fully dangling. Relinking now:

It's prompting to purge and reinstall the modules directories. That's expected given the dangling links — confirming:

Reinstall completed — `concurrently 9.2.1` is now linked into the local store. Let me verify the symlink resolves to a real file:

Fixed. The symlink now resolves to the **local** `.pnpm` store instead of the deleted reconcile worktree, and `dist/bin/concurrently.js` exists.

## What happened

A reconcile run (`reconcile-BUNDLE-5`) created a worktree under `.xgd/worktrees/`, and your root `node_modules/concurrently` symlink got pointed at *that* worktree's pnpm store. Reconcile worktrees are ephemeral — when it got cleaned up, the symlink was left dangling, so `pnpm dev` couldn't find the module.

## The fix

```bash
pnpm install --offline --config.confirmModulesPurge=false
```

This purged and rebuilt `node_modules`, relinking everything against your local store (all 629 packages reused from cache, no downloads — 5.6s).

You should be able to run `pnpm dev` now. Want me to start it and confirm it comes up clean?

Note: no ticket needed here — this was an environment/dependency repair, not a code or config change to the repo.

<!-- xgd-turn id="b1d73512-2ffa-42d4-bb5b-e0a184bfcbf8-user" -->

<!-- xgd-chat role="user" ts="2026-06-29T20:49:02.770Z" -->
#### You
The reconcile run should not be modifying any content on the working branch - it should not have the permissions to do this. Do you agree? Or is this necessary?

Node_modules on the reconcile branch points to the worktree for dependencies is there a way to isolate that from code that is in the project?

<!-- xgd-chat-end -->