import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { runGenerate } from "@1stcontact/generate";
import { FIXTURE_SITE_DIR } from "./_fixtures_REQ-6_site.js";

describe("UAT FC REQ-6: generator preloads configured fonts", () => {
  let html: string;

  beforeAll(async () => {
    const outDir = await mkdtemp(resolve(tmpdir(), "fc-gen-fonts-"));
    await runGenerate({ site: FIXTURE_SITE_DIR, out: outDir, clean: true });
    html = await readFile(resolve(outDir, "index.html"), "utf-8");
  });

  it("includes a rel=preload link for the Google Fonts CSS bundle", () => {
    expect(html).toMatch(
      /<link\s+rel="preload"\s+as="style"\s+href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]+"\s*\/?>/,
    );
  });

  it("includes a stylesheet link for the same Google Fonts bundle", () => {
    expect(html).toMatch(
      /<link\s+rel="stylesheet"\s+href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]+"\s*\/?>/,
    );
  });

  it("preload reference names the configured heading family (Manrope) for sites/1stcontact", () => {
    expect(html).toMatch(/family=Manrope/);
  });

  it("preload reference names the configured body family (Inter) for sites/1stcontact", () => {
    expect(html).toMatch(/family=Inter/);
  });

  it("adds preconnect hints for fonts.googleapis.com and fonts.gstatic.com", () => {
    expect(html).toMatch(/<link\s+rel="preconnect"\s+href="https:\/\/fonts\.googleapis\.com"/);
    expect(html).toMatch(
      /<link\s+rel="preconnect"\s+href="https:\/\/fonts\.gstatic\.com"\s+crossorigin/,
    );
  });
});
