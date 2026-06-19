import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { REPRODUCING_A_WEBSITE_DOC } from "../apps/control-app/src/llm-context.js";

const here = dirname(fileURLToPath(import.meta.url));
const howtoPath = resolve(here, "../docs/llm-context/reproducing-a-website.md");

/**
 * BUG-5: the convert flow's image fields require AssetRef objects, not strings.
 * The how-to doc previously told the AI to pass `/assets/{r2Key}` as a string,
 * which the asset-ref validator rejects and the renderer can't read `.src` off
 * of. This UAT catches a regression where the doc drifts back to string form
 * or loses the worked example.
 */
describe("UAT FC BUG-5: how-to doc instructs AI to pass AssetRef objects (not strings)", () => {
  it("docs/llm-context/reproducing-a-website.md tells the AI to pass an object with id+src+alt for image fields", () => {
    const src = readFileSync(howtoPath, "utf-8");

    // Must explicitly call out the object shape — not just "URL".
    expect(src).toMatch(/objects[, ]*not strings/i);

    // Must show the canonical AssetRef shape literally.
    expect(src).toContain('id:');
    expect(src).toContain('src:');
    expect(src).toContain('alt:');
    expect(src).toMatch(/\/assets\/<r2Key>/);

    // Must reference the precomputed assetRef field on the inventory entry.
    expect(src).toMatch(/assetRef/);

    // Must show a worked example of the resulting set_module_content call.
    expect(src).toMatch(/set_module_content/);
    expect(src).toMatch(/field:\s*"image"/);

    // Must NOT instruct the AI to pass a bare string — that's the BUG-5 regression.
    expect(src).not.toMatch(/take[s]?\s+`?\/assets\/\{r2Key\}`?\s*(?:where|\.|$)/m);
  });

  it("the inlined llm-context constant matches the .md file byte-for-byte (drift guard)", () => {
    const fromDisk = readFileSync(howtoPath, "utf-8");
    expect(REPRODUCING_A_WEBSITE_DOC).toBe(fromDisk);
  });
});
