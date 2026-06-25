import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

interface WorkflowStep {
  name?: string;
  run?: string;
}

interface WorkflowJob {
  steps?: WorkflowStep[];
}

interface Workflow {
  jobs?: Record<string, WorkflowJob>;
}

describe("UAT AC-463: deploy workflow runs the public-site generate step before the public-site wrangler deploy", () => {
  it("test_UAT_AC463_deploy_workflow_generates_before_wrangler_deploy", async () => {
    const raw = await readFile(
      resolve(repoRoot, ".github/workflows/deploy.yml"),
      "utf-8",
    );
    const wf = parse(raw) as Workflow;

    const jobs = wf.jobs ?? {};
    expect(Object.keys(jobs).length).toBeGreaterThan(0);
    const job = Object.values(jobs)[0];
    const steps = job?.steps ?? [];
    expect(steps.length).toBeGreaterThan(0);

    const generateIdx = steps.findIndex((s) => {
      const run = s.run ?? "";
      return run.includes("public-site") && run.includes("generate");
    });
    const deployIdx = steps.findIndex((s) => {
      const run = s.run ?? "";
      return run.includes("public-site") && /wrangler\s+deploy(?!\s+--dry-run)/.test(run);
    });

    expect(generateIdx, "public-site generate step present").toBeGreaterThanOrEqual(0);
    expect(deployIdx, "public-site wrangler deploy step present").toBeGreaterThanOrEqual(0);
    expect(generateIdx).toBeLessThan(deployIdx);
  });
});
