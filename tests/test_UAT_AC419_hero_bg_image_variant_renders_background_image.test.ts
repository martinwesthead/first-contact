import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import { Hero } from "@1stcontact/framework";

describe("UAT AC-419: hero bg-image variant renders the background image with the supplied src and alt", () => {
  it("test_UAT_AC419_hero_bg_image_variant_renders_background_image", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Hero, {
      props: {
        variant: "bg-image",
        heading: "Bringing the feast",
        image: {
          id: "hero-bg",
          src: "/assets/hero-photo.jpg",
          alt: "Catering team plating dinner",
        },
      },
    });

    expect(html).toContain("Bringing the feast");
    expect(html).toMatch(/data-variant="bg-image"/);

    // <img> background element marked as the hero background
    expect(html).toMatch(/<img\b[^>]*data-fc-hero-bg/);
    // src and alt match the supplied asset values
    const bgImgMatch = /<img\b[^>]*data-fc-hero-bg[^>]*>/.exec(html);
    expect(bgImgMatch).not.toBeNull();
    const bgImg = bgImgMatch![0];
    expect(bgImg).toMatch(/src="\/assets\/hero-photo\.jpg"/);
    expect(bgImg).toMatch(/alt="Catering team plating dinner"/);
  });
});
