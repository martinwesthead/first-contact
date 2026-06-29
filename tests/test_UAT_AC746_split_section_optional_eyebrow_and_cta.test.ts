import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import SplitSection from "../packages/framework/src/modules/split-section/index.astro";

// AC-746: when eyebrow and cta are absent the rendered section contains neither
// element; when both are supplied the eyebrow text appears and the cta renders
// as a link carrying its label as text and its href as destination.
describe("UAT AC-746: optional eyebrow and cta render when supplied and are omitted when absent", () => {
  it("test_UAT_AC746_split_section_optional_eyebrow_and_cta", async () => {
    const container = await AstroContainer.create();

    // Absent: neither the eyebrow nor the cta element appears.
    const without = await container.renderToString(SplitSection, {
      props: {
        variant: "image-left",
        image: { id: "i1", src: "/assets/photo.jpg", alt: "Photo" },
        heading: "Heading only",
        body: "<p>Body only.</p>",
      },
    });
    expect(without).not.toMatch(/fc-split-section__eyebrow/);
    expect(without).not.toMatch(/fc-split-section__cta/);

    // Supplied: eyebrow text shows and the cta link exposes label + href.
    const withBoth = await container.renderToString(SplitSection, {
      props: {
        variant: "image-left",
        image: { id: "i1", src: "/assets/photo.jpg", alt: "Photo" },
        eyebrow: "Why us",
        heading: "Heading",
        body: "<p>Body.</p>",
        cta: { label: "Learn more", href: "/about" },
      },
    });
    expect(withBoth).toMatch(/fc-split-section__eyebrow[^>]*>\s*Why us\s*</);
    expect(withBoth).toMatch(
      /fc-split-section__cta[^>]*href="\/about"[^>]*>\s*Learn more\s*</,
    );
  });
});
