import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import { Banner } from "@1stcontact/framework";

describe("UAT FC REQ-42: banner renders with simple variant", () => {
  it("renders heading and emits no CTA anchor when cta absent", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Banner, {
      props: {
        variant: "simple",
        heading: "Now booking spring weddings",
      },
    });

    expect(html).toContain("Now booking spring weddings");
    expect(html).toMatch(/data-module="banner"/);
    expect(html).toMatch(/data-variant="simple"/);
    expect(html).not.toMatch(/fc-banner__cta/);
  });

  it("renders eyebrow and subhead when provided", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Banner, {
      props: {
        variant: "simple",
        eyebrow: "Announcement",
        heading: "Now serving brunch",
        subhead: "Visit our **new location** on Main Street.",
      },
    });

    expect(html).toMatch(/fc-banner__eyebrow[^>]*>\s*Announcement\s*</);
    expect(html).toContain("Now serving brunch");
    expect(html).toMatch(/fc-banner__subhead/);
    expect(html).toContain("**new location**");
  });
});
