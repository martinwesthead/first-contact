import { describe, expect, it } from "vitest";
import { renderSite } from "@1stcontact/generate";
import type { Site } from "@1stcontact/site-schema";
import { makeThemeTokens } from "./_fixtures_REQ-3_site.js";

function siteWithTextRefBody(): Site {
  return {
    config: { businessName: "Acme" },
    theme: makeThemeTokens(),
    nav: { pattern: "footer-only", entries: [] },
    pages: [
      {
        id: "home",
        slug: "/",
        title: "Home",
        modules: [
          {
            id: "about-1",
            type: "text-block",
            version: 1,
            variant: "prose",
            content: {
              heading: "About us",
              body: {
                kind: "text",
                id: "sites/acct-1/copy/about.md",
                src: "sites/acct-1/copy/about.md",
                alt: "Fallback alt",
              },
            },
          },
        ],
      },
    ],
  };
}

describe("UAT FC REQ-33 AC14: tools/generate bakes text-AssetRefs into static HTML at build time", () => {
  it("resolver-provided markdown ends up as HTML inlined in the generated page", async () => {
    const resolveCalls: string[] = [];
    const rendered = await renderSite(
      { site: siteWithTextRefBody() },
      {
        resolveAsset: async (ref) => {
          resolveCalls.push((ref as { src: string }).src);
          if ((ref as { src: string }).src === "sites/acct-1/copy/about.md") {
            return "# Our story\n\nWe are a real, live business.";
          }
          return undefined;
        },
      },
    );

    expect(resolveCalls).toContain("sites/acct-1/copy/about.md");
    expect(rendered.pages).toHaveLength(1);
    const html = rendered.pages[0].html;
    // The markdown is converted to HTML and baked directly into the static
    // output — no R2 fetch needed at runtime.
    expect(html).toContain("<h1>Our story</h1>");
    expect(html).toContain("<p>We are a real, live business.</p>");
    // The fallback alt must NOT appear when the resolver succeeded.
    expect(html).not.toContain("Fallback alt");
  });

  it("when resolver returns undefined, the alt fallback is baked in instead", async () => {
    const rendered = await renderSite(
      { site: siteWithTextRefBody() },
      {
        resolveAsset: async () => undefined,
      },
    );
    expect(rendered.pages[0].html).toContain("Fallback alt");
  });

  it("with no resolver provided, the alt fallback is used (no R2 dependency required)", async () => {
    const rendered = await renderSite({ site: siteWithTextRefBody() });
    expect(rendered.pages[0].html).toContain("Fallback alt");
  });
});
