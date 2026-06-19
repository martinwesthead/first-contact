import { describe, expect, it } from "vitest";
import {
  extractSignals,
  mergeComputedSignals,
  NOT_DETECTED,
  type ComputedStyles,
} from "../packages/extractor/src/index.js";

const EMPTY_COMPUTED: ComputedStyles = {
  body: { family: "", size: "", weight: "", backgroundColor: "" },
  h1: { family: "", size: "", weight: "" },
  h2: { family: "", size: "", weight: "" },
  h3: { family: "", size: "", weight: "" },
  primaryBackgroundColor: "",
};

describe("UAT FC REQ-22: mergeComputedSignals folds computed background-image URLs into the asset inventory (AC 6)", () => {
  it("AC6: a hero background-image declared only in an external stylesheet is recovered by the computed-style pass and added as a kind='background' AssetRecord that the static parse did not produce", () => {
    // Static HTML mirrors the `external-stylesheet-bg/` fixture shape: no
    // inline background-image, only a <link rel='stylesheet'> the static
    // parser cannot follow.
    const staticHtml = `<!doctype html><html><head>
      <link rel="stylesheet" href="/styles.css">
      </head><body>
      <section class="hero"><h1>Plumber</h1></section>
      </body></html>`;
    const staticSignals = extractSignals(staticHtml, "https://acme.test/");
    expect(staticSignals.assetInventory.find((a) => a.url.endsWith("/hero-bg.jpg")))
      .toBeUndefined();

    const merged = mergeComputedSignals(
      staticSignals,
      EMPTY_COMPUTED,
      [{ url: "/hero-bg.jpg", selector: ".hero" }],
      "https://acme.test/",
    );
    const heroBg = merged.assetInventory.find((a) => a.url.endsWith("/hero-bg.jpg"));
    expect(heroBg).toBeDefined();
    expect(heroBg?.kind).toBe("background");
    expect(heroBg?.classification).toBe("unknown");
    expect(heroBg?.references).toBe(1);
    expect(merged.imagery.backgroundCount).toBe(1);
  });

  it("AC6 (dedup): a URL already present in the inventory from inline style increments references rather than duplicating", () => {
    const staticHtml = `<!doctype html><html><body>
      <section class="hero" style="background-image: url(/hero-bg.jpg);"></section>
      </body></html>`;
    const staticSignals = extractSignals(staticHtml, "https://acme.test/");
    const inlineHero = staticSignals.assetInventory.find((a) => a.url.endsWith("/hero-bg.jpg"));
    expect(inlineHero?.references).toBe(1);

    const merged = mergeComputedSignals(
      staticSignals,
      EMPTY_COMPUTED,
      [{ url: "https://acme.test/hero-bg.jpg", selector: ".hero" }],
      "https://acme.test/",
    );
    const allHero = merged.assetInventory.filter((a) => a.url.endsWith("/hero-bg.jpg"));
    expect(allHero.length).toBe(1);
    expect(allHero[0].references).toBe(2);
  });

  it("computed typography always wins over declared values when both are present", () => {
    const staticHtml = `<!doctype html><html><head><style>
      body { font-family: "Inter", system-ui; }
      h1 { font-family: "Inter", system-ui; }
    </style></head><body><h1>Hi</h1></body></html>`;
    const staticSignals = extractSignals(staticHtml, "https://acme.test/");
    const merged = mergeComputedSignals(
      staticSignals,
      {
        ...EMPTY_COMPUTED,
        body: { family: "Source Serif Pro, serif", size: "18px", weight: "500", backgroundColor: "" },
        h1: { family: "Source Serif Pro, serif", size: "56px", weight: "800" },
      },
      [],
      "https://acme.test/",
    );
    expect(merged.typography.body.family).toBe("Source Serif Pro, serif");
    expect(merged.typography.body.size).toBe("18px");
    expect(merged.typography.h1.family).toBe("Source Serif Pro, serif");
  });

  it("declared typography is preserved when computed value is empty", () => {
    const staticHtml = `<!doctype html><html><head><style>
      body { font-family: "Inter"; font-size: 16px; }
    </style></head><body></body></html>`;
    const staticSignals = extractSignals(staticHtml, "https://acme.test/");
    const merged = mergeComputedSignals(staticSignals, EMPTY_COMPUTED, [], "https://acme.test/");
    // Declared values survive (computed produced empties).
    expect(merged.typography.body.family).toBe('"Inter"');
    expect(merged.typography.body.size).toBe("16px");
    expect(merged.typography.h1.family).toBe(NOT_DETECTED);
  });
});
