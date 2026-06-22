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
  "runs-on"?: string;
  steps?: DeployStep[];
  env?: Record<string, string>;
}

interface DeployWorkflow {
  name?: string;
  on?: { push?: { branches?: string[] } } | Record<string, unknown>;
  concurrency?: { group?: string };
  jobs?: Record<string, DeployJob>;
}

describe("UAT FC REQ-1: deploy.yml workflow shape", () => {
  const path = resolve(repoRoot, ".github/workflows/deploy.yml");
  const raw = readFileSync(path, "utf-8");
  const wf = parse(raw) as DeployWorkflow;

  it("triggers on push to xgd-stable", () => {
    const branches = (wf.on as { push?: { branches?: string[] } })?.push
      ?.branches;
    expect(branches).toBeDefined();
    expect(branches).toContain("xgd-stable");
  });

  it("serializes concurrent deploys via a concurrency group", () => {
    expect(wf.concurrency?.group).toBeTruthy();
  });

  it("exposes both required Cloudflare secrets to the deploy job", () => {
    const job = wf.jobs?.deploy;
    expect(job, "deploy job present").toBeDefined();
    const env = job?.env ?? {};
    const flat = JSON.stringify(env);
    expect(flat).toContain("CLOUDFLARE_API_TOKEN");
    expect(flat).toContain("CLOUDFLARE_ACCOUNT_ID");
    expect(flat).toContain("secrets.CLOUDFLARE_API_TOKEN");
    expect(flat).toContain("secrets.CLOUDFLARE_ACCOUNT_ID");
  });

  it("invokes wrangler deploy for both Workers", () => {
    const steps = wf.jobs?.deploy?.steps ?? [];
    const runs = steps
      .map((s) => s.run ?? "")
      .filter((r) => r.includes("wrangler deploy"));
    expect(runs.length).toBeGreaterThanOrEqual(2);
    const all = runs.join("\n");
    expect(all).toContain("@gendev/public-site");
    expect(all).toContain("@gendev/control-app");
  });
});
