import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// BUG-22: build-builder-bundle.mjs must emit one independently-greppable log
// line per built bundle. REQ-17 added a second entry (app.js) and collapsed the
// output into a single brace-style `{builder,app}.js` line, which broke the
// BUG-7 `/Built .*builder\.js/` assertion. The fix emits per-entry lines so each
// bundle is greppable and adding future entries never breaks an assertion.

const repoRoot = resolve(__dirname, "..");
const scriptPath = resolve(
  repoRoot,
  "apps/control-app/scripts/build-builder-bundle.mjs",
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

describe("UAT FC BUG-22: build-builder-bundle.mjs emits per-entry build log lines", () => {
  it("one-shot mode logs an independent 'Built …/<name>.js' line for both builder and app entries", async () => {
    const result = await runOneShot();
    expect(result.code).toBe(0);
    // Each entry gets its own greppable line — not a combined brace expansion.
    expect(result.stdout).toMatch(/Built .*builder\.js/);
    expect(result.stdout).toMatch(/Built .*app\.js/);
    // The collapsed brace form that regressed BUG-7 must be gone.
    expect(result.stdout).not.toContain("{builder,app}.js");
  }, 30_000);
});
