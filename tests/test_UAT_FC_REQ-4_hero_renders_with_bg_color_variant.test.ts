import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import { Hero } from "@1stcontact/framework";

describe("UAT FC REQ-4: hero renders with bg-color variant", () => {
  it("renders heading and emits no background image element", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Hero, {
      props: {
        variant: "bg-color",
        heading: "Welcome to Acme",
      },
    });

    expect(html).toContain("Welcome to Acme");
    expect(html).toMatch(/data-variant="bg-color"/);
    expect(html).not.toMatch(/data-fc-hero-bg/);
    expect(html).not.toMatch(/<img\b/);
  });
});
