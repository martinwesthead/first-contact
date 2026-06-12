import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { parse } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

interface CiStep {
  name?: string;
  uses?: string;
  run?: string;
}

interface CiJob {
  steps?: CiStep[];
}

interface CiWorkflow {
  on?: { pull_request?: { branches?: string[] } } | Record<string, unknown>;
  jobs?: Record<string, CiJob>;
}

describe("UAT FC REQ-1: ci.yml workflow shape", () => {
  const path = resolve(repoRoot, ".github/workflows/ci.yml");
  const raw = readFileSync(path, "utf-8");
  const wf = parse(raw) as CiWorkflow;

  it("triggers on pull_request", () => {
    const pr = (wf.on as { pull_request?: unknown })?.pull_request;
    expect(pr, "pull_request trigger present").toBeDefined();
  });

  it("dry-runs deploy for both Workers", () => {
    const job = Object.values(wf.jobs ?? {})[0];
    const steps = job?.steps ?? [];
    const runs = steps.map((s) => s.run ?? "");
    const all = runs.join("\n");
    expect(all).toContain("dryrun:public");
    expect(all).toContain("dryrun:control");
  });

  it("runs the test suite", () => {
    const job = Object.values(wf.jobs ?? {})[0];
    const steps = job?.steps ?? [];
    const runsTests = steps.some((s) => (s.run ?? "").includes("pnpm test"));
    expect(runsTests, "ci runs pnpm test").toBe(true);
  });
});
