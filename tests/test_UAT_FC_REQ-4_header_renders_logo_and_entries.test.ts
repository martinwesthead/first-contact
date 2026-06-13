import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import { Header } from "@1stcontact/framework";

describe("UAT FC REQ-4: header renders logo and entries", () => {
  it("renders a logo and an anchor for every entry", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Header, {
      props: {
        logo: "Acme Co",
        entries: [
          { label: "Home", target: { kind: "page", pageId: "home" } },
          { label: "Menu", target: { kind: "page", pageId: "menu" } },
          {
            label: "Top of menu",
            target: { kind: "anchor", pageId: "menu", moduleId: "menu-hero" },
          },
          { label: "Blog", target: { kind: "url", href: "https://blog.example/" } },
        ],
      },
    });

    expect(html).toContain("Acme Co");
    expect(html).toMatch(/<a[^>]+href="\/"[^>]*>\s*Home\s*</);
    expect(html).toMatch(/<a[^>]+href="\/menu"[^>]*>\s*Menu\s*</);
    expect(html).toMatch(/<a[^>]+href="\/menu#menu-hero"[^>]*>\s*Top of menu\s*</);
    expect(html).toMatch(
      /<a[^>]+href="https:\/\/blog\.example\/"[^>]*>\s*Blog\s*</,
    );
  });
});
