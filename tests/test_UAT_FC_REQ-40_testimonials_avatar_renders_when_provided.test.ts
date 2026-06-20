import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import Testimonials from "../packages/framework/src/modules/testimonials/index.astro";

describe("UAT FC REQ-40: testimonials avatar renders only when provided", () => {
  it("renders <img class='fc-testimonials__avatar'> with the AssetRef src and alt", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Testimonials, {
      props: {
        variant: "single",
        items: [
          {
            quote: "<p>Great service.</p>",
            name: "Alice",
            avatar: { id: "img-1", src: "/avatars/alice.jpg", alt: "Alice's headshot" },
          },
        ],
      },
    });
    expect(html).toMatch(/class="fc-testimonials__avatar"/);
    expect(html).toMatch(/src="\/avatars\/alice\.jpg"/);
    expect(html).toMatch(/alt="Alice's headshot"/);
  });

  it("omits the avatar img when avatar is not provided", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Testimonials, {
      props: {
        variant: "single",
        items: [{ quote: "<p>Great service.</p>", name: "Alice" }],
      },
    });
    expect(html).not.toMatch(/fc-testimonials__avatar/);
  });
});
