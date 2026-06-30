import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// AC-819: every workspace npm package is published under the @gendev/* scope
// (renamed from the legacy @1stcontact/* scope), and no @1stcontact/* package
// name, dependency key, or import specifier survives in apps/, packages/, or
// tools/ source. The product identity is unchanged: the root package name is
// still `1stcontact`, both Worker names are still `1stcontact-*`, and the
// site-definition directory is still `sites/1stcontact/`. (The only surviving
// `@1stcontact` literal in source is the product contact email
// `hello@1stcontact.io` — an email address, not an npm scope.)

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

function readJson<T = unknown>(rel: string): T {
  return JSON.parse(readFileSync(resolve(repoRoot, rel), "utf-8")) as T;
}

function tomlTopName(raw: string): string | null {
  // Match a top-level `name = "..."` before any section header.
  for (const line of raw.split(/\r?\n/)) {
    if (/^\s*\[/.test(line)) break;
    const m = /^\s*name\s*=\s*"([^"]+)"/.exec(line);
    if (m) return m[1];
  }
  return null;
}

function workspacePackageJsons(): Array<{ rel: string; name?: string }> {
  const out: Array<{ rel: string; name?: string }> = [];
  for (const base of ["apps", "packages"]) {
    const baseDir = resolve(repoRoot, base);
    for (const entry of readdirSync(baseDir)) {
      const pkgRel = `${base}/${entry}/package.json`;
      const pkgAbs = resolve(repoRoot, pkgRel);
      let s;
      try {
        s = statSync(pkgAbs);
      } catch {
        continue;
      }
      if (!s.isFile()) continue;
      const pkg = readJson<{ name?: string }>(pkgRel);
      out.push({ rel: pkgRel, name: pkg.name });
    }
  }
  return out;
}

describe("UAT AC-819: workspace packages use the @gendev npm scope; product slug unchanged", () => {
  it("test_UAT_AC819_workspace_packages_use_gendev_scope", () => {
    // 1. Every workspace package.json name is under @gendev/.
    const pkgs = workspacePackageJsons();
    expect(pkgs.length).toBeGreaterThan(0);
    for (const { rel, name } of pkgs) {
      expect(name, `${rel} must have a name`).toBeDefined();
      expect(name, `${rel} name must be under @gendev/ scope`).toMatch(
        /^@gendev\//,
      );
    }

    // 2. The product identity is unchanged by the rename.
    const rootPkg = readJson<{ name?: string; scripts?: Record<string, string> }>(
      "package.json",
    );
    expect(rootPkg.name).toBe("1stcontact");

    const publicToml = readFileSync(
      resolve(repoRoot, "apps/public-site/wrangler.toml"),
      "utf-8",
    );
    expect(tomlTopName(publicToml)).toBe("1stcontact-public-site");
    const controlToml = readFileSync(
      resolve(repoRoot, "apps/control-app/wrangler.toml"),
      "utf-8",
    );
    expect(tomlTopName(controlToml)).toBe("1stcontact-control-app");

    expect(statSync(resolve(repoRoot, "sites/1stcontact")).isDirectory()).toBe(
      true,
    );

    // 3. Root pnpm --filter scripts target @gendev/*, none target @1stcontact/*.
    const scripts = rootPkg.scripts ?? {};
    const filterBodies = Object.values(scripts).filter((b) =>
      b.includes("--filter"),
    );
    expect(filterBodies.length).toBeGreaterThan(0);
    for (const body of filterBodies) {
      expect(body).toMatch(/--filter\s+@gendev\//);
      expect(body).not.toMatch(/@1stcontact\//);
    }

    // 4. No @1stcontact/ scope (package name, dependency key, or import
    //    specifier) survives in apps/, packages/, or tools/ source — excluding
    //    build artifacts (dist/, _assets/, *.map) and the FC evidence test.
    const grep = spawnSync(
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
        "--exclude-dir=node_modules",
        "--exclude-dir=dist",
        "--exclude-dir=.wrangler",
        "--exclude-dir=_assets",
        "--exclude=*.map",
        "--exclude=test_UAT_FC_REQ-50_*",
        "apps",
        "packages",
        "tools",
      ],
      { cwd: repoRoot, encoding: "utf-8" },
    );
    // grep exits 1 with empty stdout when no matches are found — success.
    expect((grep.stdout || "").trim()).toBe("");
  });
});
