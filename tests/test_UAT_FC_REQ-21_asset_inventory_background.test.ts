import { describe, expect, it } from "vitest";
import { parseImagery } from "../packages/extractor/src/index.js";

describe("UAT FC REQ-21: asset inventory background discovery (AC 5)", () => {
  it("AC5: inline style background-image + style-block background-image rule both land in the inventory with kind='background'", () => {
    const html = `<!doctype html><html><head><style>
      .cta { background-image: url(/cta-bg.png); }
    </style></head><body>
      <section style="background-image: url(/hero.jpg);"></section>
    </body></html>`;
    const { assetInventory } = parseImagery(html, "https://x.test/");

    const heroBg = assetInventory.find((r) => r.url.endsWith("/hero.jpg"));
    const ctaBg = assetInventory.find((r) => r.url.endsWith("/cta-bg.png"));

    expect(heroBg?.kind).toBe("background");
    expect(ctaBg?.kind).toBe("background");
    expect(assetInventory.filter((r) => r.kind === "background").length).toBe(2);
  });

  it("the `background` shorthand declaration with a url() also produces a background record", () => {
    const html = `<!doctype html><html><head><style>
      .panel { background: url(/panel.svg) center/cover no-repeat #fff; }
    </style></head><body></body></html>`;
    const { assetInventory } = parseImagery(html, "https://x.test/");
    const panel = assetInventory.find((r) => r.url.endsWith("/panel.svg"));
    expect(panel?.kind).toBe("background");
  });
});
