import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// AC-820: four productization package skeletons exist under packages/, each
// seeded with a package.json (name == @gendev/<name>), a tsconfig.json, a
// README.md, and a src/index.ts that exports nothing real (empty placeholder).
// The former packages/ui-kit stub no longer exists.

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

const SKELETONS = [
  { dir: "api-contracts", name: "@gendev/api-contracts" },
  { dir: "auth", name: "@gendev/auth" },
  { dir: "billing", name: "@gendev/billing" },
  { dir: "portal-ui", name: "@gendev/portal-ui" },
] as const;

// Remove line/block comments and whitespace-only lines so we can assert the
// remaining executable code is an empty `export {}` placeholder.
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "") // block comments
    .split(/\r?\n/)
    .map((line) => line.replace(/\/\/.*$/, "").trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .trim();
}

describe("UAT AC-820: four @gendev productization package skeletons exist; ui-kit removed", () => {
  it("test_UAT_AC820_gendev_package_skeletons_exist", () => {
    for (const { dir, name } of SKELETONS) {
      const root = resolve(repoRoot, "packages", dir);

      // Required scaffolding files all present.
      expect(existsSync(resolve(root, "package.json")), `${dir}/package.json`).toBe(
        true,
      );
      expect(existsSync(resolve(root, "tsconfig.json")), `${dir}/tsconfig.json`).toBe(
        true,
      );
      expect(existsSync(resolve(root, "README.md")), `${dir}/README.md`).toBe(true);
      expect(existsSync(resolve(root, "src/index.ts")), `${dir}/src/index.ts`).toBe(
        true,
      );

      // package.json name is the scoped @gendev/<name>.
      const pkg = JSON.parse(
        readFileSync(resolve(root, "package.json"), "utf-8"),
      ) as { name?: string };
      expect(pkg.name, `${dir} package name`).toBe(name);

      // src/index.ts exports nothing real — only the empty `export {}` marker
      // remains once comments and blank lines are stripped.
      const code = stripComments(
        readFileSync(resolve(root, "src/index.ts"), "utf-8"),
      );
      expect(code, `${dir}/src/index.ts must be an empty placeholder`).toMatch(
        /^export\s*\{\s*\}\s*;?$/,
      );
    }

    // The superseded ui-kit stub is gone.
    expect(existsSync(resolve(repoRoot, "packages/ui-kit"))).toBe(false);
  });
});
