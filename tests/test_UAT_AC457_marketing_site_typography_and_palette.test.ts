import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateSite } from "@1stcontact/site-schema";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

describe("UAT AC-457: marketing site definition uses Manrope/Inter typography and the primary/accent palette", () => {
  it("test_UAT_AC457_marketing_site_typography_and_palette", async () => {
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
    expect(site.theme.typography.family.heading).toContain("Manrope");
    expect(site.theme.typography.family.body).toContain("Inter");
    expect(site.theme.palette.primary).toBe("#2563eb");
    expect(site.theme.palette.accent).toBe("#f59e0b");
  });
});
