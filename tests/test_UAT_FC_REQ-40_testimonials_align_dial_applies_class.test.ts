import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import Testimonials from "../packages/framework/src/modules/testimonials/index.astro";

describe("UAT FC REQ-40: testimonials align dial applies a class", () => {
  const items = [{ quote: "<p>Hello.</p>", name: "Alice" }];

  it("applies fc-testimonials--align-left when dials.align='left'", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Testimonials, {
      props: { variant: "single", items, dials: { align: "left" } },
    });
    expect(html).toMatch(/fc-testimonials--align-left/);
    expect(html).not.toMatch(/fc-testimonials--align-center/);
  });

  it("defaults to fc-testimonials--align-center when align is not set", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Testimonials, {
      props: { variant: "single", items },
    });
    expect(html).toMatch(/fc-testimonials--align-center/);
    expect(html).not.toMatch(/fc-testimonials--align-left/);
  });
});
