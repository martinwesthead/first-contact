import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { parse } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

interface DeployWorkflow {
  concurrency?: { group?: string; "cancel-in-progress"?: boolean };
}

describe("UAT AC-387: deploy workflow serializes concurrent runs per ref", () => {
  it("test_UAT_AC387_deploy_concurrency_group_keyed_on_ref", () => {
    const path = resolve(repoRoot, ".github/workflows/deploy.yml");
    const raw = readFileSync(path, "utf-8");
    const wf = parse(raw) as DeployWorkflow;

    expect(wf.concurrency, "top-level concurrency block present").toBeDefined();
    const group = wf.concurrency?.group ?? "";
    expect(group.length, "concurrency.group is non-empty").toBeGreaterThan(0);

    // group must incorporate the git ref so the same ref serializes,
    // while different refs may run independently.
    expect(group).toMatch(/github\.ref/);

    // cancel-in-progress must NOT be true — concurrent same-ref runs must
    // queue and serialize, not cancel the in-flight deploy.
    const cancel = wf.concurrency?.["cancel-in-progress"];
    expect(cancel ?? false, "deploys must not cancel in progress (must queue)").toBe(false);
  });
});
