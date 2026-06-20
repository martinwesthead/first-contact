import { spawn } from "node:child_process";
import { existsSync, readFileSync, statSync, utimesSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const repoRoot = resolve(__dirname, "..");
const scriptPath = resolve(
  repoRoot,
  "apps/control-app/scripts/build-builder-bundle.mjs",
);
const bundlePath = resolve(
  repoRoot,
  "apps/control-app/public/_assets/builder.js",
);
const entrySource = resolve(repoRoot, "packages/builder-ui/src/spa.ts");

const spawned: ReturnType<typeof spawn>[] = [];

afterAll(() => {
  for (const child of spawned) {
    if (!child.killed) child.kill("SIGKILL");
  }
});

function runOneShot(): Promise<{ code: number; stdout: string }> {
  return new Promise((resolveP, rejectP) => {
    const child = spawn("node", [scriptPath], { cwd: repoRoot });
    spawned.push(child);
    let stdout = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.on("error", rejectP);
    child.on("exit", (code) => resolveP({ code: code ?? -1, stdout }));
  });
}

function startWatch(): {
  child: ReturnType<typeof spawn>;
  output: { value: string };
  waitFor: (substring: string, timeoutMs: number) => Promise<void>;
} {
  const child = spawn("node", [scriptPath, "--watch"], { cwd: repoRoot });
  spawned.push(child);
  const output = { value: "" };
  child.stdout.on("data", (chunk) => {
    output.value += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output.value += chunk.toString();
  });
  const waitFor = (substring: string, timeoutMs: number) =>
    new Promise<void>((resolveP, rejectP) => {
      const start = Date.now();
      const tick = () => {
        if (output.value.includes(substring)) return resolveP();
        if (Date.now() - start > timeoutMs) {
          return rejectP(
            new Error(
              `timeout waiting for ${JSON.stringify(substring)}; got:\n${output.value}`,
            ),
          );
        }
        setTimeout(tick, 50);
      };
      tick();
    });
  return { child, output, waitFor };
}

describe("UAT FC BUG-7: build-builder-bundle.mjs supports one-shot and watch modes", () => {
  it("one-shot mode (no --watch) builds the bundle and exits 0", async () => {
    const result = await runOneShot();
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/Built .*builder\.js/);
    expect(existsSync(bundlePath)).toBe(true);
    const size = statSync(bundlePath).size;
    expect(size).toBeGreaterThan(0);
  }, 30_000);

  it("watch mode (--watch) logs 'Watching' and rebuilds when an entry-graph source changes", async () => {
    const { child, waitFor } = startWatch();
    try {
      // Initial build with a Watching marker line.
      await waitFor("Watching", 20_000);

      // Capture initial bundle size as a baseline; the rebuild must touch the file.
      expect(existsSync(bundlePath)).toBe(true);
      const initialMtime = statSync(bundlePath).mtimeMs;

      // Touch the entry source to trigger esbuild's incremental rebuild. Use a
      // bumped mtime (current ms + 2s) so watchers that key on mtime see it.
      const now = Date.now() / 1000 + 2;
      utimesSync(entrySource, now, now);

      // Wait for the bundle's mtime to advance — proof esbuild's watcher fired
      // and produced a new bundle from the changed source.
      const deadline = Date.now() + 15_000;
      let rebuiltMtime = initialMtime;
      while (Date.now() < deadline) {
        rebuiltMtime = statSync(bundlePath).mtimeMs;
        if (rebuiltMtime > initialMtime) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      expect(rebuiltMtime).toBeGreaterThan(initialMtime);

      // Bundle must still be a non-empty valid file after rebuild.
      const contents = readFileSync(bundlePath, "utf8");
      expect(contents.length).toBeGreaterThan(0);
    } finally {
      child.kill("SIGKILL");
    }
  }, 60_000);
});
