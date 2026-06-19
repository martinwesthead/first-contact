import { describe, expect, it } from "vitest";
import { parseImagery } from "../packages/extractor/src/index.js";

describe("UAT FC REQ-21: asset inventory dedup by absolute URL (AC 7)", () => {
  it("AC7: same URL referenced from both <img> and inline background-image dedupes to a single record with references=2; img wins because it is discovered first", () => {
    const html = `<!doctype html><html><body>
      <img src="/hero.jpg" alt="Hero" width="1200" height="600">
      <section style="background-image: url(/hero.jpg);"></section>
    </body></html>`;
    const { assetInventory } = parseImagery(html, "https://x.test/");
    const matching = assetInventory.filter((r) =>
      r.url.endsWith("/hero.jpg"),
    );
    expect(matching).toHaveLength(1);
    expect(matching[0].kind).toBe("img");
    expect(matching[0].references).toBe(2);
  });

  it("a single URL referenced by srcset siblings dedupes to one record per unique URL", () => {
    const html = `<!doctype html><html><body>
      <img src="/hero.jpg" srcset="/hero.jpg 1x, /hero@2x.jpg 2x">
    </body></html>`;
    const { assetInventory } = parseImagery(html, "https://x.test/");
    const hero = assetInventory.find((r) => r.url.endsWith("/hero.jpg"));
    const hero2x = assetInventory.find((r) => r.url.endsWith("/hero@2x.jpg"));
    expect(hero?.references).toBe(2); // src + srcset 1x descriptor
    expect(hero2x?.references).toBe(1);
  });
});
