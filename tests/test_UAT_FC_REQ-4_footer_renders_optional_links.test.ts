import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import { Footer } from "@1stcontact/framework";

describe("UAT FC REQ-4: footer renders optional links", () => {
  it("emits anchors for each link when links are provided", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Footer, {
      props: {
        copyrightHolder: "Acme Co",
        copyrightYear: "2026",
        links: [
          { label: "Privacy", target: { kind: "page", pageId: "privacy" } },
          { label: "Terms", target: { kind: "page", pageId: "terms" } },
        ],
      },
    });

    expect(html).toMatch(/<a[^>]+href="\/privacy"[^>]*>\s*Privacy\s*</);
    expect(html).toMatch(/<a[^>]+href="\/terms"[^>]*>\s*Terms\s*</);
  });

  it("omits the link nav when no links are provided", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Footer, {
      props: {
        copyrightHolder: "Acme Co",
        copyrightYear: "2026",
      },
    });

    expect(html).not.toMatch(/fc-footer__nav/);
  });
});
