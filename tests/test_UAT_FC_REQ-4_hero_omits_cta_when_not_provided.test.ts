import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import { Hero } from "@1stcontact/framework";

describe("UAT FC REQ-4: hero omits CTA when not provided", () => {
  it("renders no CTA anchor when cta prop is absent", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Hero, {
      props: {
        variant: "bg-color",
        heading: "No CTA here",
      },
    });

    expect(html).toContain("No CTA here");
    expect(html).not.toMatch(/fc-hero__cta/);
  });

  it("renders the CTA anchor with label and href when provided", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Hero, {
      props: {
        variant: "bg-color",
        heading: "With CTA",
        cta: { label: "Get a quote", href: "/contact" },
      },
    });

    expect(html).toMatch(/<a[^>]+class="fc-hero__cta"[^>]+href="\/contact"[^>]*>\s*Get a quote\s*<\/a>/);
  });
});
