---
uid: comment-9ea07ee4
id: COMMENT-273
type: comment
title: Comment on bug BUG-2
created_by: xgd
created_at: '2026-06-29T20:46:00.428143+00:00'
updated_at: '2026-06-29T20:51:35.384080+00:00'
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

<!-- xgd-turn id="b1d73512-2ffa-42d4-bb5b-e0a184bfcbf8-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-29T20:51:35.352Z" -->
#### Claude
This is a good architectural question and I want to answer it accurately rather than guess. Let me investigate how the reconcile worktrees and pnpm linking are actually set up.

There's a dedicated `core/worktree/provisioning.py`. Let me read how worktrees provision node_modules — that's where the linking decision lives.

The key is `quality/worktree_setup.py` and `quality/framework.py:330`. Let me read both.

Let me check where the actual node_modules symlinking happens, since no plugin overrides the hook — and confirm whether reconcile worktrees run their own `pnpm install`.

I've traced the mechanism. Here's my read.

## What actually happened

Your reconcile run did **not** touch any git-tracked content — no source files, no commits on `xgd-working`. The only thing it corrupted was `node_modules`, which isn't version-controlled. So the blast radius was narrower than "modifying the working branch," but the failure is real.

The design intent is explicit in `xgd_source/quality/framework.py:330` and `worktree_setup.py`:

> *"the JS plugin symlinks `node_modules` from `source_worktree_path` so that `check_dependencies()` passes on a fresh branch"*

So worktrees are **deliberately** wired to share `xgd-working`'s `node_modules` rather than reinstall — for speed. The intended direction is one-way: *worktree → xgd-working* (read-only sharing).

What I found on disk was the **reverse**:

```
first-contact/node_modules/concurrently → .xgd/worktrees/.../reconcile-BUNDLE-5/node_modules/.pnpm/concurrently@9.2.1/...
```

Your *main* checkout's top-level package symlink pointed *into* the reconcile worktree's virtual store. That only happens if a `pnpm install` ran inside the reconcile worktree against a shared `node_modules` and rewrote the shared top-level symlinks to its own freshly-resolved `.pnpm` store (note `concurrently@9.2.1` — a resolution that lived in the worktree). When the ephemeral worktree was cleaned up, those symlinks dangled. That's the bug, and it's recurring (it's why I have a memory note about it).

## Do I agree it shouldn't have permission to do this?

Yes — in principle. A reconcile worktree should be **dependency-isolated**: it must not be able to leave the main checkout in a broken state. The current sharing scheme makes that guarantee impossible because the link is bidirectionally reachable — a `pnpm install` in the worktree resolves through the shared `node_modules` and mutates state the main checkout depends on.

But it's "necessary" only in the weak sense that the architecture *chose* sharing to avoid reinstall cost. It is **not** necessary in an absolute sense.

## Yes, you can isolate it — cheaply

The key fact: pnpm already uses a **global content-addressable store** on this machine:

```
/Users/martin/Library/pnpm/store/v3
```

So the reason sharing was introduced (reinstall is slow / disk-heavy) is mostly moot. A per-worktree `pnpm install --offline` **hardlinks** from that global store — it doesn't re-download or copy package contents. My fix earlier reused all 629 packages in **5.6s** with zero downloads. That's the evidence: per-worktree installs are cheap.

The clean fix, in order of preference:

1. **Give each worktree its own `node_modules`** populated by `pnpm install --offline --prefer-offline` instead of symlinking from `xgd-working`. This fully decouples worktree dependency state from main — deleting a reconcile worktree can *never* dangle the main checkout. Slightly more inodes, negligible disk (hardlinks), a few seconds of setup. This is what I'd do.

2. **If sharing must stay**, make it strictly read-only and one-directional: symlink the worktree's `node_modules` to xgd-working and *forbid `pnpm install` inside any worktree*. Fragile — one stray install reintroduces the bug — so I don't recommend it.

## Where the fix belongs

The relevant code is in the installed `xgd_source` package (`quality/` worktree-dependency setup), **not** this project repo. So this isn't something I'd free-code under BUG-2 — it's an upstream xgd change. 

Want me to:
- **(a)** write this up as a proper xgd issue/spec (root cause + the per-worktree-install fix), or
- **(b)** prototype the change against the `xgd_source` plugin and show you the diff before anything touches the package?

<!-- xgd-chat-end -->