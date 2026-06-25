import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import { Hero } from "@1stcontact/framework";

describe("UAT AC-420: hero omits the CTA when no CTA content is provided", () => {
  it("test_UAT_AC420_hero_omits_cta_when_not_provided", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Hero, {
      props: {
        variant: "bg-color",
        heading: "No CTA here",
        // cta omitted on purpose
      },
    });

    expect(html).toContain("No CTA here");
    // No anchor bearing the hero-cta marker class.
    expect(html).not.toMatch(/class="[^"]*fc-hero__cta[^"]*"/);
    expect(html).not.toMatch(/<a\b[^>]*class="[^"]*fc-hero__cta/);
  });
});
