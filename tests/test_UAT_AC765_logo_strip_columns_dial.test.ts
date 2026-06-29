import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import LogoStrip from "../packages/framework/src/modules/logo-strip/index.astro";

const validImage = { id: "i1", src: "/assets/logo.png", alt: "Acme" };
const items = [
  { image: { ...validImage, id: "a" } },
  { image: { ...validImage, id: "b" } },
  { image: { ...validImage, id: "c" } },
];

/**
 * AC-765: The `columns` dial controls the desktop column count via the rendered
 * output. A `columns` value of `3`, `4`, `5`, or `6` renders the matching
 * `--columns-{N}` class; when the dial is omitted the output renders
 * `--columns-4` (default 4).
 */
describe("UAT AC-765: logo-strip columns dial emits the corresponding columns class, defaulting to 4", () => {
  it("test_UAT_AC765_columns_dial_emits_matching_class_and_defaults_to_4", async () => {
    const container = await AstroContainer.create();

    for (const columns of ["3", "4", "5", "6"] as const) {
      const html = await container.renderToString(LogoStrip, {
        props: { variant: "logos", items, dials: { columns } },
      });
      expect(html).toMatch(new RegExp(`fc-logo-strip--columns-${columns}`));
    }

    // No columns dial supplied → default of 4.
    const defaultHtml = await container.renderToString(LogoStrip, {
      props: { variant: "logos", items },
    });
    expect(defaultHtml).toMatch(/fc-logo-strip--columns-4/);
  });
});
