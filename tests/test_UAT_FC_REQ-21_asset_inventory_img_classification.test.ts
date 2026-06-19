import { describe, expect, it } from "vitest";
import { parseImagery } from "../packages/extractor/src/index.js";

describe("UAT FC REQ-21: asset inventory img classification (AC 4)", () => {
  it("AC4: 1200x600 near top classifies hero; 100x100 in <nav> classifies decorative; 400x400 mid-page classifies unknown; each emits exactly one record with references=1", () => {
    const html = `<!doctype html><html><body>
      <nav>
        <img src="/logo.svg" alt="Acme" width="100" height="100">
      </nav>
      <section>
        <img src="/hero.jpg" alt="Hero" width="1200" height="600">
      </section>
      <section>
        <img src="/feature.png" alt="Feature" width="400" height="400">
      </section>
    </body></html>`;
    const { assetInventory } = parseImagery(html, "https://x.test/");

    const byName = new Map<string, (typeof assetInventory)[number]>();
    for (const r of assetInventory) byName.set(r.url, r);

    const logo = byName.get("https://x.test/logo.svg");
    const hero = byName.get("https://x.test/hero.jpg");
    const feature = byName.get("https://x.test/feature.png");

    expect(logo?.classification).toBe("decorative");
    expect(hero?.classification).toBe("hero");
    expect(feature?.classification).toBe("unknown");

    for (const r of assetInventory) {
      expect(r.references).toBe(1);
    }
    expect(assetInventory.filter((r) => r.kind === "img").length).toBe(3);
  });

  it("hero detection requires the image area to be sufficient — a 300x300 first img is not promoted to hero", () => {
    const html = `<!doctype html><html><body>
      <section>
        <img src="/a.jpg" width="300" height="300">
        <img src="/b.jpg" width="100" height="100">
      </section>
    </body></html>`;
    const { assetInventory } = parseImagery(html, "https://x.test/");
    const a = assetInventory.find((r) => r.url.endsWith("/a.jpg"));
    expect(a?.classification).toBe("unknown");
  });
});
