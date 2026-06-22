// UAT for REQ-50: the four productization-layer package skeletons exist with
// the required files and correct @gendev/ scope. packages/ui-kit is removed.
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "..");

const NEW_PACKAGES = [
  { dir: "api-contracts", name: "@gendev/api-contracts" },
  { dir: "auth", name: "@gendev/auth" },
  { dir: "billing", name: "@gendev/billing" },
  { dir: "portal-ui", name: "@gendev/portal-ui" },
] as const;

describe("REQ-50 package skeletons", () => {
  for (const { dir, name } of NEW_PACKAGES) {
    it(`${dir}: has package.json, tsconfig.json, README.md, src/index.ts under @gendev/ scope`, () => {
      const root = resolve(REPO_ROOT, "packages", dir);
      expect(existsSync(resolve(root, "package.json"))).toBe(true);
      expect(existsSync(resolve(root, "tsconfig.json"))).toBe(true);
      expect(existsSync(resolve(root, "README.md"))).toBe(true);
      expect(existsSync(resolve(root, "src/index.ts"))).toBe(true);

      const pkg = JSON.parse(
        readFileSync(resolve(root, "package.json"), "utf-8"),
      ) as { name?: string };
      expect(pkg.name).toBe(name);
    });
  }

  it("packages/ui-kit is removed (superseded by portal-ui)", () => {
    const root = resolve(REPO_ROOT, "packages/ui-kit");
    expect(existsSync(root)).toBe(false);
  });
});
