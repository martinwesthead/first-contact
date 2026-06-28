import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// AC-682: The builder SPA bundler runs as a one-shot build when no --watch flag
// is passed (the default `build:bundle` control-app script): it performs a
// single build, exits 0, emits a `Built <outfile>` log line, and writes a
// non-empty bundle to apps/control-app/public/_assets/builder.js.

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

describe("UAT AC-682: builder bundler one-shot mode builds a non-empty bundle and exits cleanly", () => {
  it("test_UAT_AC682_builder_bundler_one_shot_build", async () => {
    const result = await runOneShot();

    // Single build, clean exit.
    expect(result.code).toBe(0);

    // Emits the `Built <outfile>` log line naming the produced bundle.
    expect(result.stdout).toMatch(/Built .*builder\.js/);

    // Writes a non-empty bundle to the served asset path.
    expect(existsSync(bundlePath)).toBe(true);
    expect(statSync(bundlePath).size).toBeGreaterThan(0);
  }, 30_000);
});
