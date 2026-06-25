import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import { Hero } from "@1stcontact/framework";

describe("UAT AC-418: hero bg-color variant renders without a background image element", () => {
  it("test_UAT_AC418_hero_bg_color_variant_renders_without_image", async () => {
    const container = await AstroContainer.create();

    // bg-color with heading content only
    const html = await container.renderToString(Hero, {
      props: {
        variant: "bg-color",
        heading: "Welcome to Acme",
      },
    });

    expect(html).toContain("Welcome to Acme");
    expect(html).toMatch(/data-variant="bg-color"/);

    // No background image element / marker.
    expect(html).not.toMatch(/data-fc-hero-bg/);
    expect(html).not.toMatch(/fc-hero__bg-image/);

    // bg-color with an incidentally-supplied image — must STILL emit no bg image
    const htmlWithImage = await container.renderToString(Hero, {
      props: {
        variant: "bg-color",
        heading: "Welcome",
        image: {
          id: "ignored",
          src: "/should-not-appear.jpg",
          alt: "should not appear",
        },
      },
    });

    expect(htmlWithImage).toMatch(/data-variant="bg-color"/);
    expect(htmlWithImage).not.toMatch(/data-fc-hero-bg/);
    expect(htmlWithImage).not.toMatch(/fc-hero__bg-image/);
    expect(htmlWithImage).not.toContain("/should-not-appear.jpg");
  });
});
