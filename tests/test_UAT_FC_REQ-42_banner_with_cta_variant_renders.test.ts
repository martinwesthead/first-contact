import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import { Banner } from "@1stcontact/framework";

describe("UAT FC REQ-42: banner renders with with-cta variant", () => {
  it("emits the CTA anchor with label and href when cta provided", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Banner, {
      props: {
        variant: "with-cta",
        heading: "Limited spots remaining",
        cta: { label: "Reserve now", href: "/book" },
      },
    });

    expect(html).toContain("Limited spots remaining");
    expect(html).toMatch(/data-variant="with-cta"/);
    expect(html).toMatch(/<a[^>]+class="fc-banner__cta"[^>]+href="\/book"[^>]*>\s*Reserve now\s*<\/a>/);
  });

  it("omits the CTA anchor when cta is absent even on with-cta variant", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Banner, {
      props: {
        variant: "with-cta",
        heading: "Heading only, no CTA",
      },
    });

    expect(html).toContain("Heading only, no CTA");
    expect(html).not.toMatch(/fc-banner__cta/);
  });
});
