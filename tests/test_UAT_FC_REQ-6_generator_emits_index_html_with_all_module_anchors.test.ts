import { readFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { runGenerate } from "@1stcontact/generate";
import { FIXTURE_SITE_DIR } from "./_fixtures_REQ-6_site.js";

describe("UAT FC REQ-6: generator emits index.html with all module anchors", () => {
  let html: string;

  beforeAll(async () => {
    const outDir = await mkdtemp(resolve(tmpdir(), "fc-gen-anchors-"));
    await runGenerate({ site: FIXTURE_SITE_DIR, out: outDir, clean: true });
    html = await readFile(resolve(outDir, "index.html"), "utf-8");
  });

  it.each([
    "site-header",
    "hero",
    "how-it-works",
    "services",
    "about",
    "contact",
    "site-footer",
  ])("index.html contains anchor id for module '%s'", (id) => {
    expect(html).toMatch(new RegExp(`id="${id}"`));
  });

  it("html doctype is present", () => {
    expect(html.trim().startsWith("<!doctype html>")).toBe(true);
  });
});
