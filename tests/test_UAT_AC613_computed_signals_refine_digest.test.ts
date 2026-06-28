import { describe, expect, it } from "vitest";
import {
  extractSignals,
  mergeComputedSignals,
  type ComputedStyles,
} from "../packages/extractor/src/index.js";

/**
 * AC-613: Merging computed styles into the static Layer A signals refines the
 * digest: (a) computed typography and computed palette background-colour
 * override the declared values; (b) a computed background-image URL the static
 * parse missed (e.g. declared only in an external stylesheet) is folded into
 * the inventory as a kind='background' record (absolute URL, references=1);
 * (c) a computed URL already present increments references rather than
 * duplicating. The imagery summary's background count reflects the merge.
 */
describe("UAT AC-613: computed signals refine the digest", () => {
  it("test_UAT_AC613_computed_signals_refine_digest", () => {
    // Static HTML: declares body/h1 typography + a palette, and references one
    // background-image inline (the "already present" URL). The hero's real
    // background lives only in an external stylesheet the static parse cannot
    // follow — so /hero-bg.jpg is NOT in the static inventory.
    const staticHtml = `<!doctype html><html><head><style>
        body { font-family: "Inter", system-ui; color: #222222; background-color: #ffffff; }
        h1 { font-family: "Inter", system-ui; }
      </style></head><body>
        <section class="banner" style="background-image: url(/banner.jpg);"></section>
        <section class="hero"><h1>Plumber</h1></section>
      </body></html>`;
    const baseUrl = "https://acme.test/";
    const staticSignals = extractSignals(staticHtml, baseUrl);

    // Sanity: the external-stylesheet hero background is absent from the static
    // parse; the inline banner background is present exactly once.
    expect(
      staticSignals.assetInventory.find((a) => a.url.endsWith("/hero-bg.jpg")),
    ).toBeUndefined();
    const bannerBefore = staticSignals.assetInventory.find((a) =>
      a.url.endsWith("/banner.jpg"),
    );
    expect(bannerBefore?.references).toBe(1);

    // Computed pass: typography + palette background override declared values,
    // and surfaces two background-image URLs — one new (/hero-bg.jpg) and one
    // already in the inventory (/banner.jpg).
    const computed: ComputedStyles = {
      body: {
        family: "Roboto, Arial, sans-serif",
        size: "18px",
        weight: "500",
        backgroundColor: "rgb(10, 20, 30)",
      },
      h1: { family: "Roboto, Arial, sans-serif", size: "56px", weight: "800" },
      h2: { family: "", size: "", weight: "" },
      h3: { family: "", size: "", weight: "" },
      primaryBackgroundColor: "rgb(10, 20, 30)",
    };
    const merged = mergeComputedSignals(
      staticSignals,
      computed,
      [
        { url: "/hero-bg.jpg", selector: ".hero" },
        { url: "/banner.jpg", selector: ".banner" },
      ],
      baseUrl,
    );

    // (b) The new external-stylesheet URL appears exactly once as a background.
    const heroRecords = merged.assetInventory.filter((a) =>
      a.url.endsWith("/hero-bg.jpg"),
    );
    expect(heroRecords.length).toBe(1);
    expect(heroRecords[0].url).toBe("https://acme.test/hero-bg.jpg");
    expect(heroRecords[0].kind).toBe("background");
    expect(heroRecords[0].classification).toBe("unknown");
    expect(heroRecords[0].references).toBe(1);

    // (c) The already-present URL increments references instead of duplicating.
    const bannerRecords = merged.assetInventory.filter((a) =>
      a.url.endsWith("/banner.jpg"),
    );
    expect(bannerRecords.length).toBe(1);
    expect(bannerRecords[0].references).toBe(2);

    // The imagery summary background count reflects the merged inventory.
    expect(merged.imagery.backgroundCount).toBe(2);

    // (a) Computed typography and palette background win over the declared ones.
    expect(merged.typography.body.family).toBe("Roboto, Arial, sans-serif");
    expect(merged.typography.body.size).toBe("18px");
    expect(merged.typography.h1.family).toBe("Roboto, Arial, sans-serif");
    expect(merged.palette.background).toBe("rgb(10, 20, 30)");
  });
});
