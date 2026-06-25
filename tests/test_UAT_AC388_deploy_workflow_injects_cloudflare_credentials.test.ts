import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { parse } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

interface Job {
  env?: Record<string, string>;
  steps?: Array<{ env?: Record<string, string> }>;
}

interface Workflow {
  env?: Record<string, string>;
  jobs?: Record<string, Job>;
}

function loadYaml(rel: string): { wf: Workflow; raw: string } {
  const path = resolve(repoRoot, rel);
  const raw = readFileSync(path, "utf-8");
  return { wf: parse(raw) as Workflow, raw };
}

describe("UAT AC-388: deploy workflow injects Cloudflare credentials (and CI does not)", () => {
  it("test_UAT_AC388_deploy_env_sources_secrets_and_ci_does_not", () => {
    const { wf: deploy } = loadYaml(".github/workflows/deploy.yml");

    const deployJob = deploy.jobs?.deploy;
    expect(deployJob, "deploy job present").toBeDefined();

    const env = deployJob?.env ?? {};
    expect(Object.keys(env)).toContain("CLOUDFLARE_API_TOKEN");
    expect(Object.keys(env)).toContain("CLOUDFLARE_ACCOUNT_ID");

    const apiToken = String(env.CLOUDFLARE_API_TOKEN ?? "");
    const accountId = String(env.CLOUDFLARE_ACCOUNT_ID ?? "");
    expect(apiToken).toContain("secrets.CLOUDFLARE_API_TOKEN");
    expect(accountId).toContain("secrets.CLOUDFLARE_ACCOUNT_ID");

    const { wf: ci, raw: ciRaw } = loadYaml(".github/workflows/ci.yml");

    const topEnv = ci.env ?? {};
    expect(Object.keys(topEnv)).not.toContain("CLOUDFLARE_API_TOKEN");
    expect(Object.keys(topEnv)).not.toContain("CLOUDFLARE_ACCOUNT_ID");

    for (const job of Object.values(ci.jobs ?? {})) {
      const jobEnv = job.env ?? {};
      expect(Object.keys(jobEnv)).not.toContain("CLOUDFLARE_API_TOKEN");
      expect(Object.keys(jobEnv)).not.toContain("CLOUDFLARE_ACCOUNT_ID");
      for (const step of job.steps ?? []) {
        const stepEnv = step.env ?? {};
        expect(Object.keys(stepEnv)).not.toContain("CLOUDFLARE_API_TOKEN");
        expect(Object.keys(stepEnv)).not.toContain("CLOUDFLARE_ACCOUNT_ID");
      }
    }

    expect(ciRaw).not.toMatch(/secrets\.CLOUDFLARE_API_TOKEN/);
    expect(ciRaw).not.toMatch(/secrets\.CLOUDFLARE_ACCOUNT_ID/);
  });
});
