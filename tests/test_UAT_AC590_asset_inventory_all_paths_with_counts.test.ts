import { describe, expect, it } from "vitest";
import { parseImagery } from "../packages/extractor/src/index.js";

describe("UAT AC-590: asset inventory captures every visual asset across all reference paths with per-kind counts", () => {
  it("test_UAT_AC590_asset_inventory_all_paths_with_counts", () => {
    const html = `<!doctype html><html><head><style>
      .panel { background-image: url(/block-bg.png); }
    </style></head><body>
      <nav>
        <img src="/logo.svg" alt="Acme" width="100" height="100">
      </nav>
      <section style="background-image: url(/inline-bg.jpg);"></section>
      <section>
        <img src="/hero.jpg" alt="Hero" width="1200" height="600">
      </section>
      <video src="/intro.mp4"></video>
    </body></html>`;
    const { signals, assetInventory } = parseImagery(html, "https://x.test/");

    const byUrl = new Map(assetInventory.map((r) => [r.url, r]));

    // One record per distinct visual asset, each with an absolute URL + kind.
    const logo = byUrl.get("https://x.test/logo.svg");
    const hero = byUrl.get("https://x.test/hero.jpg");
    const inlineBg = byUrl.get("https://x.test/inline-bg.jpg");
    const blockBg = byUrl.get("https://x.test/block-bg.png");
    const video = byUrl.get("https://x.test/intro.mp4");

    expect(logo?.kind).toBe("img");
    expect(hero?.kind).toBe("img");
    expect(inlineBg?.kind).toBe("background");
    expect(blockBg?.kind).toBe("background");
    expect(video?.kind).toBe("video");

    // Classification: the small nav image is decorative, the large top image is hero.
    expect(logo?.classification).toBe("decorative");
    expect(hero?.classification).toBe("hero");

    // The imagery summary counts match the inventory.
    expect(signals.imgCount).toBe(2);
    expect(signals.backgroundCount).toBe(2);
    expect(signals.videoCount).toBe(1);
    expect(signals.heroDetected).toBe(true);

    expect(signals.imgCount).toBe(
      assetInventory.filter((r) => r.kind === "img").length,
    );
    expect(signals.backgroundCount).toBe(
      assetInventory.filter((r) => r.kind === "background").length,
    );
    expect(signals.videoCount).toBe(
      assetInventory.filter((r) => r.kind === "video").length,
    );
  });
});
