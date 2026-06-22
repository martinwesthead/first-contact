import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import { Banner, bakeModuleContentForRender } from "@gendev/framework";
import type { ModuleInstance } from "@gendev/site-schema";

// AC-758: when given an eyebrow and a subhead, the rendered section shows the
// eyebrow as a label above the heading and renders the subhead content, with
// the subhead treated as markdown so inline formatting (emphasis/links) is
// carried through rather than stripped.
describe("UAT AC-758: banner renders optional eyebrow label and markdown subhead", () => {
  it("test_UAT_AC758_banner_renders_eyebrow_label_and_markdown_subhead", async () => {
    // The subhead field is registered in the render layer's markdown metadata
    // registry: baking a banner instance turns inline markdown into HTML
    // (emphasis + links preserved), exactly like the hero subhead.
    const instance: ModuleInstance = {
      id: "banner-1",
      type: "banner",
      version: 1,
      variant: "simple",
      content: {
        eyebrow: "Announcement",
        heading: "Now serving brunch",
        subhead: "Visit our **new location** and [book a table](/book).",
      },
    };
    const baked = bakeModuleContentForRender(instance) as Record<string, unknown>;
    const bakedSubhead = baked.subhead as string;
    expect(bakedSubhead).toContain("<strong>new location</strong>");
    expect(bakedSubhead).toContain('<a href="/book">book a table</a>');

    // Rendering the module injects the processed subhead HTML and shows the
    // eyebrow as a label positioned above the heading.
    const container = await AstroContainer.create();
    const html = await container.renderToString(Banner, {
      props: {
        variant: "simple",
        eyebrow: "Announcement",
        heading: "Now serving brunch",
        subhead: bakedSubhead,
      },
    });

    // Eyebrow label text appears.
    expect(html).toMatch(/fc-banner__eyebrow[^>]*>\s*Announcement\s*</);
    // Heading text appears.
    expect(html).toContain("Now serving brunch");
    // Eyebrow is positioned above the heading in document order.
    expect(html.indexOf("fc-banner__eyebrow")).toBeLessThan(
      html.indexOf("fc-banner__heading"),
    );
    // Subhead is rendered, with inline markdown formatting carried through.
    expect(html).toMatch(/fc-banner__subhead/);
    expect(html).toContain("<strong>new location</strong>");
    expect(html).toContain('<a href="/book">book a table</a>');
  });
});
