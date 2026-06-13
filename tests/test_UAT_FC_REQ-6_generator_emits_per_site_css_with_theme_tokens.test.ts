import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { runGenerate } from "@1stcontact/generate";
import { FIXTURE_SITE_DIR } from "./_fixtures_REQ-6_site.js";

describe("UAT FC REQ-6: generator emits per-site CSS with theme tokens", () => {
  let css: string;
  let html: string;

  beforeAll(async () => {
    const outDir = await mkdtemp(resolve(tmpdir(), "fc-gen-css-"));
    await runGenerate({ site: FIXTURE_SITE_DIR, out: outDir, clean: true });
    css = await readFile(resolve(outDir, "assets/theme.css"), "utf-8");
    html = await readFile(resolve(outDir, "index.html"), "utf-8");
  });

  it("css contains the site's primary colour as --color-primary", () => {
    expect(css).toMatch(/--color-primary:\s*#2563eb/);
  });

  it("css contains the spacing scale step --space-4", () => {
    expect(css).toMatch(/--space-4:/);
  });

  it("html links to the generated theme.css", () => {
    expect(html).toMatch(/<link[^>]+href="\/assets\/theme\.css"/);
  });
});
