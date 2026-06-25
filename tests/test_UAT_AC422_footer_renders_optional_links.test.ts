import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import { Footer } from "@1stcontact/framework";

describe("UAT AC-422: footer renders the optional small-link row when navigation entries are supplied", () => {
  it("test_UAT_AC422_footer_renders_optional_links", async () => {
    const container = await AstroContainer.create();

    // With two links — one page target, one url target — the footer
    // renders a footer-nav region containing one anchor per entry.
    const withLinks = await container.renderToString(Footer, {
      props: {
        copyrightHolder: "Acme Co",
        copyrightYear: "2026",
        links: [
          { label: "Privacy", target: { kind: "page", pageId: "privacy" } },
          {
            label: "Support",
            target: { kind: "url", href: "https://support.example/" },
          },
        ],
      },
    });

    // Navigation region present (the fc-footer__nav class is the marker)
    expect(withLinks).toMatch(/<nav\b[^>]*class="[^"]*fc-footer__nav/);

    // Two anchors — one per supplied link — with correct labels and hrefs.
    expect(withLinks).toMatch(/<a\b[^>]*href="\/privacy"[^>]*>\s*Privacy\s*</);
    expect(withLinks).toMatch(
      /<a\b[^>]*href="https:\/\/support\.example\/"[^>]*>\s*Support\s*</,
    );

    // Exactly two footer links rendered.
    const footerLinkCount = (withLinks.match(/class="fc-footer__link"/g) ?? []).length;
    expect(footerLinkCount).toBe(2);

    // Without a links prop — no footer navigation region rendered at all.
    const withoutLinks = await container.renderToString(Footer, {
      props: {
        copyrightHolder: "Acme Co",
        copyrightYear: "2026",
      },
    });

    expect(withoutLinks).not.toMatch(/fc-footer__nav/);
    expect(withoutLinks).not.toMatch(/<nav\b/);
  });
});
