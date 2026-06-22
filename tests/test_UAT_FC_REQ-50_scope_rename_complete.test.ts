// UAT for REQ-50: no `@1stcontact/` import or package reference survives in
// source files (excluding ticket bodies, build artifacts, lockfile).
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "..");

describe("REQ-50 scope rename", () => {
  it("no @1stcontact/ references remain in tracked source", () => {
    // grep across the source tree, excluding ticket bodies (.xgd/tickets) and
    // generated artifacts (node_modules, dist, .wrangler, public/_assets,
    // pnpm-lock.yaml). The REQ explicitly allows historical mentions in
    // ticket bodies — those are documentation of the rename, not consumers.
    const result = spawnSync(
      "grep",
      [
        "-rln",
        "@1stcontact/",
        "--include=*.ts",
        "--include=*.tsx",
        "--include=*.json",
        "--include=*.astro",
        "--include=*.mjs",
        "--include=*.js",
        "--include=*.md",
        "--include=*.yaml",
        "--include=*.yml",
        "--exclude-dir=node_modules",
        "--exclude-dir=dist",
        "--exclude-dir=.wrangler",
        "--exclude-dir=_assets",
        "--exclude-dir=tickets",
        "--exclude=pnpm-lock.yaml",
        "--exclude=test_UAT_FC_REQ-50_*",
        "packages",
        "apps",
        "tools",
        "tests",
        "sites",
        "docs",
        "package.json",
      ],
      { cwd: REPO_ROOT, encoding: "utf-8" },
    );
    // grep exits 1 when no matches found — that is the success case.
    const matches = (result.stdout || "").trim();
    expect(matches).toBe("");
  });
});
