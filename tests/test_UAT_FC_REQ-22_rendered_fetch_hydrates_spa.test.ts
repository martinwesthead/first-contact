import { describe, expect, it } from "vitest";
import {
  loadFixture,
  makeFakeDriver,
  makeHarness,
  TINY_PNG,
} from "./_helpers_REQ-22_rendered.js";
import { ReferenceDigest } from "../packages/extractor/src/index.js";

const HYDRATED_HTML = `
<!doctype html><html><head><title>Acme</title></head>
<body>
  <header><nav><a href="/">Acme</a><a href="/about">About</a></nav></header>
  <main>
    <section class="hero"><h1>Build with Acme</h1>
    <p>${"X".repeat(1100)}</p>
    <button class="cta">Get started</button></section>
    <section class="features"><h2>Features</h2></section>
  </main>
</body></html>`;

describe("UAT FC REQ-22: renderedFetch hydrates a SPA (AC 4 + AC 5 + AC 14)", () => {
  it("AC4+AC5+AC14: render-by-default — the js-spa fixture runs the rendered path, the fake driver returns hydrated HTML with >1000 chars of visible text, and the digest's body typography reflects computed values (not 'not_detected')", async () => {
    const h = makeHarness();
    h.setHtmlBody(loadFixture("js-spa"));
    h.setAnthropicCommentary({
      summary: "A hydrated SPA landing page with a hero, features, and CTA.",
      perSection: { typography: "Inter body, Inter h1." },
      whatsMissing: [],
    });
    h.installDriver(
      makeFakeDriver({
        html: HYDRATED_HTML,
        computedStyles: {
          body: { family: "Inter, system-ui, sans-serif", size: "16px", weight: "400", backgroundColor: "rgb(255, 255, 255)" },
          h1: { family: "Inter, system-ui, sans-serif", size: "48px", weight: "700" },
          h2: { family: "Inter, system-ui, sans-serif", size: "32px", weight: "700" },
          h3: { family: "Inter, system-ui, sans-serif", size: "24px", weight: "600" },
          primaryBackgroundColor: "rgb(255, 255, 255)",
        },
        computedBackgroundAssets: [],
        screenshotPngs: { mobile: TINY_PNG, tablet: TINY_PNG, desktop: TINY_PNG },
      }),
    );

    const result = await h.invoke({ url: "https://spa.test/" });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    const payload = result.payload as { digest: unknown };
    const parsed = ReferenceDigest.parse(payload.digest);
    expect(parsed.fetchPath).toBe("rendered");
    // Computed family populated — not the static-path 'not_detected'.
    expect(parsed.signals.typography.body.family).toBe("Inter, system-ui, sans-serif");
    expect(parsed.signals.typography.h1.family).toBe("Inter, system-ui, sans-serif");
  });
});
