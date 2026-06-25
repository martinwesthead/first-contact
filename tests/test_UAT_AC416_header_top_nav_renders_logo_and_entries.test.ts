import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import { Header } from "@1stcontact/framework";

describe("UAT AC-416: header top-nav variant renders the logo and one anchor per navigation entry", () => {
  it("test_UAT_AC416_header_top_nav_renders_logo_and_entries", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Header, {
      props: {
        logo: {
          id: "site-logo",
          src: "/assets/logo.svg",
          alt: "Acme Co logo",
        },
        entries: [
          { label: "Home", target: { kind: "page", pageId: "home" } },
          { label: "About", target: { kind: "page", pageId: "about" } },
          {
            label: "Menu Top",
            target: { kind: "anchor", pageId: "menu", moduleId: "menu-hero" },
          },
          { label: "Blog", target: { kind: "url", href: "https://blog.example/" } },
        ],
      },
    });

    // Variant marker
    expect(html).toMatch(/data-variant="top-nav"/);

    // Logo: AssetRef → <img> with src and alt
    expect(html).toMatch(/<img[^>]+src="\/assets\/logo\.svg"[^>]*>/);
    expect(html).toMatch(/<img[^>]+alt="Acme Co logo"[^>]*>/);

    // One anchor per entry with expected hrefs:
    //   page(home) → /
    //   page(about) → /about
    //   anchor(menu#menu-hero) → /menu#menu-hero
    //   url → literal href
    expect(html).toMatch(/<a[^>]+href="\/"[^>]*>\s*Home\s*</);
    expect(html).toMatch(/<a[^>]+href="\/about"[^>]*>\s*About\s*</);
    expect(html).toMatch(/<a[^>]+href="\/menu#menu-hero"[^>]*>\s*Menu Top\s*</);
    expect(html).toMatch(
      /<a[^>]+href="https:\/\/blog\.example\/"[^>]*>\s*Blog\s*</,
    );

    // Confirm each entry is present exactly once (4 nav links + the logo link).
    const navLinkCount = (html.match(/class="fc-header__link"/g) ?? []).length;
    expect(navLinkCount).toBe(4);
  });
});
