import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import { Footer } from "@gendev/framework";

describe("UAT FC REQ-4: footer renders copyright with build-time year", () => {
  it("renders the configured year and copyright holder in the copyright line", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Footer, {
      props: {
        copyrightHolder: "Acme Co",
        copyrightYear: "2026",
      },
    });

    expect(html).toMatch(/fc-footer__copyright/);
    expect(html).toContain("2026");
    expect(html).toContain("Acme Co");
    expect(html).toMatch(/&(copy|#xa9|#169);/i);
  });
});
