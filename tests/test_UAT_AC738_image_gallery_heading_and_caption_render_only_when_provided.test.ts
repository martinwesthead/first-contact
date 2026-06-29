import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ImageGallery from "../packages/framework/src/modules/image-gallery/index.astro";

const asset = (id: string) => ({ id, src: `/img/${id}.jpg`, alt: id });

async function render(props: Record<string, unknown>): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(ImageGallery, { props });
}

describe("UAT AC-738: image-gallery heading and per-item caption render only when provided", () => {
  it("test_UAT_AC738_image_gallery_heading_and_caption_render_only_when_provided", async () => {
    const baseItems = [{ image: asset("a") }, { image: asset("b") }];

    // Heading present when supplied.
    const withHeading = await render({
      variant: "grid",
      heading: "Our Work",
      items: baseItems,
    });
    expect(withHeading).toMatch(/fc-image-gallery__heading/);
    expect(withHeading).toMatch(/Our Work/);

    // Heading omitted entirely when absent.
    const withoutHeading = await render({ variant: "grid", items: baseItems });
    expect(withoutHeading).not.toMatch(/fc-image-gallery__heading/);

    // Caption renders only for items that supply one; absent for items without.
    const mixed = await render({
      variant: "grid",
      items: [
        { image: asset("a"), caption: "Plated entrée" },
        { image: asset("b") },
        { image: asset("c"), caption: "Dessert" },
      ],
    });
    const captions = mixed.match(/fc-image-gallery__caption/g) ?? [];
    expect(captions.length).toBe(2);
    expect(mixed).toMatch(/Plated entr/);
    expect(mixed).toMatch(/Dessert/);
  });
});
