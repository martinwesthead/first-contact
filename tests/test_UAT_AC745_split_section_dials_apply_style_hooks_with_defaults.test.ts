import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import SplitSection from "../packages/framework/src/modules/split-section/index.astro";

const baseProps = {
  variant: "image-left" as const,
  image: { id: "i1", src: "/assets/photo.jpg", alt: "Photo" },
  heading: "H",
  body: "<p>B.</p>",
};

// AC-745: each configuration dial surfaces as a corresponding style hook, and
// unspecified dials fall back to their documented defaults (imageRatio=landscape,
// size=md, surface=default, spacingTop=spacingBottom=12).
describe("UAT AC-745: configuration dials apply matching style hooks with documented defaults", () => {
  it("test_UAT_AC745_split_section_dials_apply_style_hooks_with_defaults", async () => {
    const container = await AstroContainer.create();

    // Each imageRatio value applies its matching ratio hook.
    for (const imageRatio of ["square", "portrait", "landscape"] as const) {
      const html = await container.renderToString(SplitSection, {
        props: { ...baseProps, dials: { imageRatio } },
      });
      expect(html).toMatch(new RegExp(`fc-split-section--ratio-${imageRatio}`));
    }

    // Each size value applies its matching size hook.
    for (const size of ["sm", "md", "lg"] as const) {
      const html = await container.renderToString(SplitSection, {
        props: { ...baseProps, dials: { size } },
      });
      expect(html).toMatch(new RegExp(`fc-split-section--size-${size}`));
    }

    // Each surface value applies its matching surface hook.
    for (const surface of ["default", "subtle", "inverse", "accent"] as const) {
      const html = await container.renderToString(SplitSection, {
        props: { ...baseProps, dials: { surface } },
      });
      expect(html).toMatch(new RegExp(`fc-split-section--surface-${surface}`));
    }

    // A chosen spacing value applies its matching top/bottom hooks.
    const spaced = await container.renderToString(SplitSection, {
      props: { ...baseProps, dials: { spacingTop: "4", spacingBottom: "8" } },
    });
    expect(spaced).toMatch(/fc-split-section--space-top-4/);
    expect(spaced).toMatch(/fc-split-section--space-bottom-8/);

    // With no dials supplied, the documented defaults are emitted.
    const defaults = await container.renderToString(SplitSection, {
      props: { ...baseProps },
    });
    expect(defaults).toMatch(/fc-split-section--ratio-landscape/);
    expect(defaults).toMatch(/fc-split-section--size-md/);
    expect(defaults).toMatch(/fc-split-section--surface-default/);
    expect(defaults).toMatch(/fc-split-section--space-top-12/);
    expect(defaults).toMatch(/fc-split-section--space-bottom-12/);
  });
});
