import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import { bakeModuleContentForRender } from "@gendev/framework";
import type { ModuleInstance } from "@gendev/site-schema";
import SplitSection from "../packages/framework/src/modules/split-section/index.astro";

// AC-743: rendering the image-left variant produces a section marked as
// image-left, with the media before the content in DOM order, and the supplied
// image, heading, and markdown body all present in the output.
describe("UAT AC-743: image-left variant renders image before text with required content", () => {
  it("test_UAT_AC743_split_section_image_left_variant", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SplitSection, {
      props: {
        variant: "image-left",
        image: { id: "i1", src: "/assets/photo.jpg", alt: "Our team" },
        heading: "Trust the team",
        body: "<p>About us.</p>",
      },
    });

    // Section is marked as the image-left variant.
    expect(html).toMatch(/data-variant="image-left"/);
    expect(html).toMatch(/fc-split-section--variant-image-left/);

    // Media precedes content in document order.
    const mediaIdx = html.indexOf("fc-split-section__media");
    const contentIdx = html.indexOf("fc-split-section__content");
    expect(mediaIdx).toBeGreaterThan(-1);
    expect(contentIdx).toBeGreaterThan(-1);
    expect(mediaIdx).toBeLessThan(contentIdx);

    // Image (source + alt), heading, and body all appear.
    expect(html).toMatch(/src="\/assets\/photo\.jpg"/);
    expect(html).toMatch(/alt="Our team"/);
    expect(html).toMatch(/Trust the team/);
    expect(html).toMatch(/About us\./);
  });

  // Bake path: the static generator bakes `body` from raw markdown to HTML (it
  // is declared `markdown` in the meta). This exercises the markdown→HTML
  // conversion the renderer relies on — not the `set:html` passthrough proven
  // above — and guards against `split-section` going missing from the render
  // layer's markdown metadata map.
  it("test_UAT_AC743_split_section_body_baked_from_markdown_to_html", () => {
    const instance: ModuleInstance = {
      id: "s1",
      type: "split-section",
      version: 1,
      variant: "image-left",
      content: {
        image: { id: "i1", src: "/assets/photo.jpg", alt: "Our team" },
        heading: "Trust the team",
        body: "About **us** today.",
      },
    };

    const baked = bakeModuleContentForRender(instance) as Record<string, unknown>;
    const bakedBody = baked.body as string;

    // Raw markdown is converted to HTML, not passed through verbatim.
    expect(bakedBody).toContain("<strong>us</strong>");
    expect(bakedBody).not.toContain("**us**");
  });
});
