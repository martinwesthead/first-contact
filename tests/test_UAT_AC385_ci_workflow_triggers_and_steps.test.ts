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
  on?: Record<string, unknown>;
  jobs?: Record<string, CiJob>;
}

function loadCiWorkflow(): CiWorkflow {
  const path = resolve(repoRoot, ".github/workflows/ci.yml");
  return parse(readFileSync(path, "utf-8")) as CiWorkflow;
}

function firstIndex(steps: CiStep[], predicate: (s: CiStep) => boolean): number {
  return steps.findIndex(predicate);
}

describe("UAT AC-385: CI workflow triggers on PRs and runs install/build/test/dry-runs in order", () => {
  it("test_UAT_AC385_ci_pr_triggers_and_step_order", () => {
    const wf = loadCiWorkflow();

    const on = wf.on as { pull_request?: { branches?: string[] }; workflow_dispatch?: unknown };
    expect(on.pull_request, "pull_request trigger present").toBeDefined();
    const branches = on.pull_request?.branches ?? [];
    expect(branches).toContain("main");
    expect(branches).toContain("xgd-working");
    expect(branches).toContain("xgd-stable");

    expect(on.workflow_dispatch !== undefined, "workflow_dispatch trigger present").toBe(true);

    const jobs = wf.jobs ?? {};
    const job = Object.values(jobs)[0];
    expect(job, "ci workflow has a job").toBeDefined();
    const steps = job?.steps ?? [];
    expect(steps.length).toBeGreaterThan(0);

    const installIdx = firstIndex(
      steps,
      (s) => (s.run ?? "").includes("pnpm install") && (s.run ?? "").includes("--frozen-lockfile"),
    );
    const buildIdx = firstIndex(steps, (s) => /pnpm\s+(-r\s+)?build/.test(s.run ?? ""));
    const testIdx = firstIndex(steps, (s) => /\bpnpm\s+test\b/.test(s.run ?? ""));
    const dryPublicIdx = firstIndex(
      steps,
      (s) => (s.run ?? "").includes("dryrun:public") || (s.run ?? "").includes("@1stcontact/public-site") && (s.run ?? "").includes("dryrun"),
    );
    const dryControlIdx = firstIndex(
      steps,
      (s) => (s.run ?? "").includes("dryrun:control") || (s.run ?? "").includes("@1stcontact/control-app") && (s.run ?? "").includes("dryrun"),
    );

    expect(installIdx, "frozen-lockfile install step present").toBeGreaterThanOrEqual(0);
    expect(buildIdx, "build step present").toBeGreaterThanOrEqual(0);
    expect(testIdx, "test step present").toBeGreaterThanOrEqual(0);
    expect(dryPublicIdx, "public-site dry-run step present").toBeGreaterThanOrEqual(0);
    expect(dryControlIdx, "control-app dry-run step present").toBeGreaterThanOrEqual(0);

    expect(installIdx).toBeLessThan(buildIdx);
    expect(buildIdx).toBeLessThan(testIdx);
    expect(testIdx).toBeLessThan(dryPublicIdx);
    expect(testIdx).toBeLessThan(dryControlIdx);
  });
});
