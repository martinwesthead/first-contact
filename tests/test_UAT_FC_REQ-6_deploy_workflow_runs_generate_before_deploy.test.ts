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

async function loadWorkflow(name: string): Promise<Workflow> {
  const path = resolve(repoRoot, ".github/workflows", name);
  const raw = await readFile(path, "utf-8");
  return parse(raw) as Workflow;
}

function stepIndex(steps: WorkflowStep[], predicate: (s: WorkflowStep) => boolean): number {
  return steps.findIndex(predicate);
}

describe("UAT FC REQ-6: deploy workflow runs generate before wrangler deploy", () => {
  it("deploy.yml has a 'generate public-site' step BEFORE 'wrangler deploy' for public-site", async () => {
    const wf = await loadWorkflow("deploy.yml");
    const job = wf.jobs?.deploy;
    expect(job?.steps, "deploy job must have steps").toBeDefined();
    const steps = job!.steps!;

    const generateIdx = stepIndex(steps, (s) =>
      Boolean(s.run && s.run.includes("public-site") && s.run.includes("generate")),
    );
    const deployIdx = stepIndex(steps, (s) =>
      Boolean(
        s.run
          && s.run.includes("public-site")
          && s.run.includes("wrangler deploy"),
      ),
    );

    expect(generateIdx, "expected a generate step for public-site").toBeGreaterThanOrEqual(0);
    expect(deployIdx, "expected a wrangler deploy step for public-site").toBeGreaterThanOrEqual(0);
    expect(generateIdx).toBeLessThan(deployIdx);
  });

  it("ci.yml runs generate before the public-site dry-run deploy", async () => {
    const wf = await loadWorkflow("ci.yml");
    const job = wf.jobs?.check;
    expect(job?.steps, "check job must have steps").toBeDefined();
    const steps = job!.steps!;

    const generateIdx = stepIndex(steps, (s) =>
      Boolean(s.run && s.run.includes("public-site") && s.run.includes("generate")),
    );
    const dryrunIdx = stepIndex(steps, (s) =>
      Boolean(s.run && s.run.includes("dryrun:public")),
    );

    expect(generateIdx).toBeGreaterThanOrEqual(0);
    expect(dryrunIdx).toBeGreaterThanOrEqual(0);
    expect(generateIdx).toBeLessThan(dryrunIdx);
  });
});
