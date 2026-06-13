import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runGenerate, SiteLoadError } from "@1stcontact/generate";

describe("UAT FC REQ-6: generator validates site def against schema", () => {
  let siteDir: string;
  let outDir: string;

  beforeAll(async () => {
    const root = await mkdtemp(resolve(tmpdir(), "fc-gen-invalid-"));
    siteDir = resolve(root, "site");
    outDir = resolve(root, "out");
    await mkdir(siteDir, { recursive: true });
    await writeFile(
      resolve(siteDir, "site.json"),
      JSON.stringify({
        config: { businessName: "Broken" },
        // missing theme, nav, pages → should fail validation
      }),
    );
  });

  afterAll(async () => {
    // tmp dirs are auto-cleaned by the OS; nothing to do here.
  });

  it("throws SiteLoadError when site.json fails schema validation", async () => {
    let caught: unknown;
    try {
      await runGenerate({ site: siteDir, out: outDir });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(SiteLoadError);
    expect((caught as Error).message).toMatch(/Site validation failed/);
  });
});
