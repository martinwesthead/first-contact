import { mkdtemp, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { runGenerate } from "@1stcontact/generate";
import { FIXTURE_SITE_DIR } from "./_fixtures_REQ-6_site.js";

describe("UAT FC REQ-6: generator copies assets to output", () => {
  let outDir: string;

  beforeAll(async () => {
    outDir = await mkdtemp(resolve(tmpdir(), "fc-gen-assets-"));
    await runGenerate({ site: FIXTURE_SITE_DIR, out: outDir, clean: true });
  });

  it("placeholder.png is copied under /assets/site/", async () => {
    const dest = resolve(outDir, "assets/site/placeholder.png");
    const info = await stat(dest);
    expect(info.isFile()).toBe(true);
    expect(info.size).toBeGreaterThan(0);
  });
});
