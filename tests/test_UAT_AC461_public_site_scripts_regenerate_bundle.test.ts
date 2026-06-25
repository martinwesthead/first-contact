import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { runGenerate } from "@1stcontact/generate";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

interface PackageJson {
  scripts?: Record<string, string>;
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

describe("UAT AC-461: public-site build, deploy, and dryrun scripts regenerate the static bundle before continuing", () => {
  it("test_UAT_AC461_public_site_scripts_regenerate_bundle_before_downstream", async () => {
    const pkgRaw = await readFile(
      resolve(repoRoot, "apps/public-site/package.json"),
      "utf-8",
    );
    const pkg = JSON.parse(pkgRaw) as PackageJson;
    const scripts = pkg.scripts ?? {};

    expect(scripts.generate, "generate script must exist").toBeDefined();
    expect(scripts.generate).toMatch(/fc-generate/);
    expect(scripts.generate).toMatch(/sites\/1stcontact/);

    const downstreamByScript: Record<string, RegExp> = {
      build: /tsc(\s|$)/,
      deploy: /wrangler\s+deploy(?!\s+--dry-run)/,
      dryrun: /wrangler\s+deploy\s+--dry-run/,
    };

    for (const [scriptName, downstreamRe] of Object.entries(downstreamByScript)) {
      const body = scripts[scriptName];
      expect(body, `${scriptName} script must exist`).toBeDefined();
      const generateIdx = body!.indexOf("pnpm generate");
      const downstreamMatch = downstreamRe.exec(body!);
      expect(
        generateIdx,
        `${scriptName} must invoke 'pnpm generate'`,
      ).toBeGreaterThanOrEqual(0);
      expect(
        downstreamMatch,
        `${scriptName} must invoke its downstream command`,
      ).not.toBeNull();
      expect(
        downstreamMatch!.index,
        `${scriptName}: downstream command must come after generate`,
      ).toBeGreaterThan(generateIdx);

      const between = body!.slice(
        generateIdx + "pnpm generate".length,
        downstreamMatch!.index,
      );
      expect(
        between,
        `${scriptName}: generate must short-circuit on failure via '&&' before downstream`,
      ).toMatch(/&&/);
    }

    const outDir = await mkdtemp(resolve(tmpdir(), "ac461-pubsite-"));
    expect(await exists(resolve(outDir, "index.html"))).toBe(false);
    expect(await exists(resolve(outDir, "assets/theme.css"))).toBe(false);

    const result = await runGenerate({
      site: resolve(repoRoot, "sites/1stcontact"),
      out: outDir,
      clean: true,
    });

    expect(result.pagesWritten.length).toBeGreaterThan(0);
    expect(await exists(resolve(outDir, "index.html"))).toBe(true);
    expect(await exists(resolve(outDir, "assets/theme.css"))).toBe(true);
  });
});
