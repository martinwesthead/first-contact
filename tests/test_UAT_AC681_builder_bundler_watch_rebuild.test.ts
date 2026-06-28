import { spawn } from "node:child_process";
import { existsSync, readFileSync, statSync, utimesSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// AC-681: The builder SPA bundler supports a file-watching mode. Invoked with
// --watch it stays running, emits a `Watching <entry> → <outfile>` line after
// the initial build, and rebuilds the served bundle whenever a source file in
// the entry dependency graph (packages/builder-ui or packages/framework) is
// edited — so the change reaches the browser without a manual rebuild.

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const scriptPath = resolve(
  repoRoot,
  "apps/control-app/scripts/build-builder-bundle.mjs",
);
const bundlePath = resolve(
  repoRoot,
  "apps/control-app/public/_assets/builder.js",
);
// An entry-graph source under packages/builder-ui — spa.ts imports main.ts, so
// touching it is inside the bundle's dependency graph and triggers a rebuild.
const entryGraphSource = resolve(repoRoot, "packages/builder-ui/src/main.ts");

const spawned: ReturnType<typeof spawn>[] = [];

afterAll(() => {
  for (const child of spawned) {
    if (!child.killed) child.kill("SIGKILL");
  }
});

function startWatch(): {
  child: ReturnType<typeof spawn>;
  waitFor: (substring: string, timeoutMs: number) => Promise<void>;
} {
  const child = spawn("node", [scriptPath, "--watch"], { cwd: repoRoot });
  spawned.push(child);
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });
  const waitFor = (substring: string, timeoutMs: number) =>
    new Promise<void>((resolveP, rejectP) => {
      const start = Date.now();
      const tick = () => {
        if (output.includes(substring)) return resolveP();
        if (Date.now() - start > timeoutMs) {
          return rejectP(
            new Error(
              `timeout waiting for ${JSON.stringify(substring)}; got:\n${output}`,
            ),
          );
        }
        setTimeout(tick, 50);
      };
      tick();
    });
  return { child, waitFor };
}

describe("UAT AC-681: builder bundler watch mode rebuilds the SPA on source change", () => {
  it("test_UAT_AC681_builder_bundler_watch_rebuild", async () => {
    const { child, waitFor } = startWatch();
    try {
      // --watch stays running and announces the watch after the initial build.
      await waitFor("Watching", 20_000);

      // The watcher's initial build may finish writing the bundle just after the
      // "Watching" line is logged — poll until the served bundle exists before
      // baselining its mtime.
      const existsDeadline = Date.now() + 15_000;
      while (!existsSync(bundlePath) && Date.now() < existsDeadline) {
        await new Promise((r) => setTimeout(r, 100));
      }
      expect(existsSync(bundlePath)).toBe(true);
      const initialMtime = statSync(bundlePath).mtimeMs;

      // Touch an entry-graph source (mtime bump only, contents unchanged) so the
      // watcher's incremental rebuild fires.
      const stamp = Date.now() / 1000 + 2;
      utimesSync(entryGraphSource, stamp, stamp);

      // The served bundle's mtime must advance — proof the watcher rewrote it.
      const deadline = Date.now() + 15_000;
      let rebuiltMtime = initialMtime;
      while (Date.now() < deadline) {
        rebuiltMtime = statSync(bundlePath).mtimeMs;
        if (rebuiltMtime > initialMtime) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      expect(rebuiltMtime).toBeGreaterThan(initialMtime);

      // Rebuilt bundle is still a non-empty file.
      expect(readFileSync(bundlePath, "utf8").length).toBeGreaterThan(0);
    } finally {
      child.kill("SIGKILL");
    }
  }, 60_000);
});
