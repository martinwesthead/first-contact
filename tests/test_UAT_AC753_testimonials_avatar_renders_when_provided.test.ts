import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import Testimonials from "../packages/framework/src/modules/testimonials/index.astro";

// AC-753: when an item supplies an avatar asset reference, the card renders a
// small (~64px) circular avatar image carrying the reference's src and alt. When
// no avatar is supplied, no avatar image is rendered for that item.
describe("UAT AC-753: avatar renders as a circular image with the asset source and alt when supplied, and is omitted when absent", () => {
  it("test_UAT_AC753_testimonials_avatar_renders_when_provided", async () => {
    const container = await AstroContainer.create();

    // With an avatar asset reference, the card includes an avatar image whose
    // src and alt match the reference, presented at ~64px (circular via the hook).
    const withAvatar = await container.renderToString(Testimonials, {
      props: {
        variant: "single",
        items: [
          {
            quote: "<p>Great service.</p>",
            name: "Alice",
            avatar: {
              id: "img-1",
              src: "/avatars/alice.jpg",
              alt: "Alice's headshot",
            },
          },
        ],
      },
    });
    expect(withAvatar).toMatch(/class="fc-testimonials__avatar"/);
    expect(withAvatar).toMatch(/src="\/avatars\/alice\.jpg"/);
    expect(withAvatar).toMatch(/alt="Alice's headshot"/);
    expect(withAvatar).toMatch(/width="64"/);

    // With no avatar supplied, no avatar image is rendered for that item.
    const withoutAvatar = await container.renderToString(Testimonials, {
      props: {
        variant: "single",
        items: [{ quote: "<p>Great service.</p>", name: "Alice" }],
      },
    });
    expect(withoutAvatar).not.toMatch(/fc-testimonials__avatar/);
  });
});
