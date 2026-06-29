#!/usr/bin/env node
/**
 * BUG-20 — dev-only bridge so the worker always rebuilds on workspace changes.
 *
 * `wrangler dev` re-bundles the worker when its own entry (`src/index.ts`)
 * changes, but it does NOT watch the source of linked workspace packages
 * (`node_modules/@gendev/* -> ../../packages/*`). So an edit to a shared
 * package (e.g. @gendev/web-fetch-safety) never reaches the running worker
 * until a full restart.
 *
 * This watcher watches the `src/` of every `workspace:*` dependency of the app
 * and, on a source change, bumps the mtime of the worker entry. That nudges
 * wrangler's existing rebuild path to re-bundle the full graph — picking up the
 * workspace change — with no process restart, so the port and miniflare state
 * (D1/KV/R2) are preserved.
 *
 * Wired into `pnpm dev` alongside `wrangler dev`.
 */
import { watch, realpathSync, existsSync, readFileSync } from "node:fs";
import { utimes } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_FILE = /\.(ts|tsx|js|mjs|cjs|json)$/;

/** True for files whose change should trigger a worker re-bundle. */
export function isWatchableSourceFile(name) {
  return typeof name === "string" && SOURCE_FILE.test(name);
}

/**
 * Resolve the `src/` directory of every `workspace:*` dependency declared by
 * the app at `appRoot`. Each dep is resolved through its node_modules symlink
 * to the real package directory, so it works regardless of package-vs-dir
 * naming. Deps without a `src/` dir are skipped.
 */
export function workspaceDepSrcDirs(appRoot) {
  const pkg = JSON.parse(readFileSync(join(appRoot, "package.json"), "utf8"));
  const deps = pkg.dependencies ?? {};
  const dirs = [];
  for (const [name, spec] of Object.entries(deps)) {
    if (!String(spec).startsWith("workspace:")) continue;
    const linked = join(appRoot, "node_modules", name);
    let real;
    try {
      real = realpathSync(linked);
    } catch {
      continue; // dep not linked yet — skip rather than crash the dev server
    }
    const src = join(real, "src");
    if (existsSync(src)) dirs.push(src);
  }
  return dirs.sort();
}

/** Bump the entry file's mtime so wrangler re-bundles the worker. */
export async function touchEntry(entryPath) {
  const now = new Date();
  await utimes(entryPath, now, now);
}

function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const appRoot = resolve(here, "..");
  const entry = join(appRoot, "src", "index.ts");
  const dirs = workspaceDepSrcDirs(appRoot);

  let timer = null;
  const nudge = (reason) => {
    // Debounce: a burst of save events collapses into a single re-bundle.
    clearTimeout(timer);
    timer = setTimeout(() => {
      touchEntry(entry)
        .then(() =>
          console.log(`[dev-worker-rebuild] ${reason} → re-bundling worker`),
        )
        .catch((err) =>
          console.error(`[dev-worker-rebuild] touch failed: ${err}`),
        );
    }, 200);
  };

  for (const dir of dirs) {
    try {
      watch(dir, { recursive: true }, (_event, filename) => {
        if (isWatchableSourceFile(filename)) nudge(`${dir}/${filename}`);
      });
      console.log(`[dev-worker-rebuild] watching ${dir}`);
    } catch (err) {
      console.error(`[dev-worker-rebuild] cannot watch ${dir}: ${err}`);
    }
  }
  console.log(`[dev-worker-rebuild] active — entry: ${entry}`);
}

// Run the watcher only when invoked directly, never when imported (e.g. tests).
const invokedPath = process.argv[1] ? realpathSync(process.argv[1]) : "";
if (invokedPath && invokedPath === realpathSync(fileURLToPath(import.meta.url))) {
  main();
}
