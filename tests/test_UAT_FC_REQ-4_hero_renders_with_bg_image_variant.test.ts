import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import { Hero } from "@gendev/framework";

describe("UAT FC REQ-4: hero renders with bg-image variant", () => {
  it("emits an <img> background element with the asset src and alt", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Hero, {
      props: {
        variant: "bg-image",
        heading: "Bringing the feast",
        image: {
          id: "hero-bg",
          src: "/assets/hero.jpg",
          alt: "Catering team at work",
        },
      },
    });

    expect(html).toContain("Bringing the feast");
    expect(html).toMatch(/data-variant="bg-image"/);
    expect(html).toMatch(/<img[^>]+data-fc-hero-bg/);
    expect(html).toMatch(/src="\/assets\/hero\.jpg"/);
    expect(html).toMatch(/alt="Catering team at work"/);
  });
});
