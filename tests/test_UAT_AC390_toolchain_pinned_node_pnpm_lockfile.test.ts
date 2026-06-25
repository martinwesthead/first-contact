import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { parse } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

interface RootPkg {
  engines?: { node?: string; pnpm?: string };
  packageManager?: string;
}

interface Step {
  run?: string;
}
interface Job {
  steps?: Step[];
}
interface Workflow {
  jobs?: Record<string, Job>;
}

function frozenLockfileSteps(wf: Workflow): Step[] {
  const matches: Step[] = [];
  for (const job of Object.values(wf.jobs ?? {})) {
    for (const step of job.steps ?? []) {
      const run = step.run ?? "";
      if (run.includes("pnpm install") && run.includes("--frozen-lockfile")) {
        matches.push(step);
      }
    }
  }
  return matches;
}

describe("UAT AC-390: toolchain pinned to Node 20+ and pnpm 9+, lockfile committed, workflows use --frozen-lockfile", () => {
  it("test_UAT_AC390_toolchain_pinned_with_frozen_lockfile", () => {
    const pkg = JSON.parse(
      readFileSync(resolve(repoRoot, "package.json"), "utf-8"),
    ) as RootPkg;

    const nodeEngine = pkg.engines?.node ?? "";
    expect(nodeEngine.length, "engines.node is declared").toBeGreaterThan(0);
    // Accept ">=20", ">=20.0.0", "20", "20.x", "^20", "20.x.x" etc., but
    // reject anything that doesn't target the Node 20+ major.
    const nodeMajorOk =
      />=\s*20\b/.test(nodeEngine) ||
      /^\s*20(\b|\.)/.test(nodeEngine) ||
      /^\s*\^?20\b/.test(nodeEngine);
    expect(
      nodeMajorOk,
      `engines.node="${nodeEngine}" must target Node 20+ (e.g. ">=20", "20.x")`,
    ).toBe(true);

    const packageManager = pkg.packageManager ?? "";
    expect(packageManager, "packageManager field is declared").toMatch(/^pnpm@/);
    const pmVersionMatch = /^pnpm@(\d+)\.[0-9]+/.exec(packageManager);
    expect(
      pmVersionMatch,
      `packageManager="${packageManager}" must be pnpm@9.x`,
    ).not.toBeNull();
    expect(Number(pmVersionMatch![1])).toBe(9);

    const lockPath = resolve(repoRoot, "pnpm-lock.yaml");
    expect(existsSync(lockPath), "pnpm-lock.yaml committed at repo root").toBe(true);

    const ci = parse(
      readFileSync(resolve(repoRoot, ".github/workflows/ci.yml"), "utf-8"),
    ) as Workflow;
    const deploy = parse(
      readFileSync(resolve(repoRoot, ".github/workflows/deploy.yml"), "utf-8"),
    ) as Workflow;

    expect(
      frozenLockfileSteps(ci).length,
      "ci.yml installs with --frozen-lockfile",
    ).toBeGreaterThan(0);
    expect(
      frozenLockfileSteps(deploy).length,
      "deploy.yml installs with --frozen-lockfile",
    ).toBeGreaterThan(0);
  });
});
