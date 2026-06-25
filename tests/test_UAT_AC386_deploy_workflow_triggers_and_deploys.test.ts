import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { parse } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

interface DeployStep {
  name?: string;
  uses?: string;
  run?: string;
}

interface DeployJob {
  steps?: DeployStep[];
  env?: Record<string, string>;
}

interface DeployWorkflow {
  on?: Record<string, unknown>;
  jobs?: Record<string, DeployJob>;
}

function loadDeployWorkflow(): DeployWorkflow {
  const path = resolve(repoRoot, ".github/workflows/deploy.yml");
  return parse(readFileSync(path, "utf-8")) as DeployWorkflow;
}

describe("UAT AC-386: deploy workflow triggers on xgd-stable and deploys both Workers", () => {
  it("test_UAT_AC386_deploy_triggers_and_step_order", () => {
    const wf = loadDeployWorkflow();

    const on = wf.on as { push?: { branches?: string[] }; workflow_dispatch?: unknown };
    expect(on.push, "push trigger present").toBeDefined();
    const branches = on.push?.branches ?? [];
    expect(branches).toContain("xgd-stable");

    expect(on.workflow_dispatch !== undefined, "workflow_dispatch trigger present").toBe(true);

    const jobs = wf.jobs ?? {};
    expect(Object.keys(jobs).length).toBeGreaterThan(0);
    const job = Object.values(jobs)[0];
    const steps = job?.steps ?? [];
    expect(steps.length).toBeGreaterThan(0);

    const installIdx = steps.findIndex(
      (s) => (s.run ?? "").includes("pnpm install") && (s.run ?? "").includes("--frozen-lockfile"),
    );
    const buildIdx = steps.findIndex((s) => /pnpm\s+(-r\s+)?build/.test(s.run ?? ""));
    const publicDeployIdx = steps.findIndex(
      (s) =>
        (s.run ?? "").includes("wrangler deploy") &&
        (s.run ?? "").includes("@1stcontact/public-site") &&
        (s.run ?? "").includes("--env production"),
    );
    const controlDeployIdx = steps.findIndex(
      (s) =>
        (s.run ?? "").includes("wrangler deploy") &&
        (s.run ?? "").includes("@1stcontact/control-app") &&
        (s.run ?? "").includes("--env production"),
    );

    expect(installIdx, "install step present").toBeGreaterThanOrEqual(0);
    expect(buildIdx, "build step present").toBeGreaterThanOrEqual(0);
    expect(publicDeployIdx, "public-site production deploy step present").toBeGreaterThanOrEqual(0);
    expect(controlDeployIdx, "control-app production deploy step present").toBeGreaterThanOrEqual(0);

    expect(installIdx).toBeLessThan(buildIdx);
    expect(buildIdx).toBeLessThan(publicDeployIdx);
    expect(buildIdx).toBeLessThan(controlDeployIdx);
    expect(publicDeployIdx).toBeLessThan(controlDeployIdx);

    expect(publicDeployIdx).not.toBe(controlDeployIdx);
  });
});
