import { describe, expect, it } from "vitest";
import { parseImagery } from "../packages/extractor/src/index.js";

describe("UAT FC REQ-21: asset inventory video discovery (AC 6)", () => {
  it("AC6: <video src> AND <source src> nested inside <video> are both surfaced as kind='video' records", () => {
    const html = `<!doctype html><html><body>
      <video src="/intro.mp4"></video>
      <video>
        <source src="/promo.webm" type="video/webm">
      </video>
    </body></html>`;
    const { assetInventory } = parseImagery(html, "https://x.test/");

    const intro = assetInventory.find((r) => r.url.endsWith("/intro.mp4"));
    const promo = assetInventory.find((r) => r.url.endsWith("/promo.webm"));

    expect(intro?.kind).toBe("video");
    expect(promo?.kind).toBe("video");
    expect(assetInventory.filter((r) => r.kind === "video").length).toBe(2);
  });
});
