import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateSite } from "@1stcontact/site-schema";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

describe("UAT AC-456: marketing site definition declares the Phase 0 seven-module home page with in-page-anchors navigation", () => {
  it("test_UAT_AC456_marketing_site_definition_phase0_seven_modules", async () => {
    const raw = await readFile(
      resolve(repoRoot, "sites/1stcontact/site.json"),
      "utf-8",
    );
    const parsed = JSON.parse(raw);
    const result = validateSite(parsed);

    if (!result.ok) {
      console.error(JSON.stringify(result.errors, null, 2));
    }
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const site = result.value;

    const homePages = site.pages.filter((p) => p.slug === "/");
    expect(homePages.length).toBe(1);
    const home = homePages[0];
    expect(home.id).toBe("home");

    const expectedModules: Array<{ type: string; variant?: string }> = [
      { type: "header" },
      { type: "hero" },
      { type: "text-block", variant: "landing" },
      { type: "services-grid", variant: "three-col" },
      { type: "text-block", variant: "prose" },
      { type: "contact-form" },
      { type: "footer" },
    ];

    expect(home.modules.length).toBe(expectedModules.length);

    home.modules.forEach((module, idx) => {
      const expected = expectedModules[idx];
      expect(module.type, `module ${idx} type`).toBe(expected.type);
      if (expected.variant !== undefined) {
        expect(module.variant, `module ${idx} variant`).toBe(expected.variant);
      }
    });

    expect(site.nav.pattern).toBe("in-page-anchors");
    expect(site.nav.entries.length).toBeGreaterThan(0);

    const moduleIds = new Set(home.modules.map((m) => m.id));
    const anchorEntries = site.nav.entries.filter(
      (e) => e.target.kind === "anchor",
    );
    expect(anchorEntries.length).toBeGreaterThan(0);
    for (const entry of anchorEntries) {
      if (entry.target.kind !== "anchor") continue;
      expect(entry.target.pageId).toBe("home");
      expect(moduleIds.has(entry.target.moduleId)).toBe(true);
    }
  });
});
