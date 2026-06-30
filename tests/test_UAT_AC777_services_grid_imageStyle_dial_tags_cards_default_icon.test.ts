import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ServicesGrid from "../packages/framework/src/modules/services-grid/index.astro";

// The section-level imageStyle dial (icon/cover/thumb) tags the rendered
// services-grid with the matching `fc-services-grid--image-<style>` modifier
// class, defaulting to `icon` when omitted. The modifier class controls how each
// item image is sized within its card (icon pictogram, thumb fixed square, cover
// full-bleed 16:9 banner) — sizing rules are scoped <style> that the container
// renderer does not inline, so they are read from the module source.
const image = { id: "asset-1", src: "/assets/cover.jpg", alt: "Cover photo" };

const modulePath = fileURLToPath(
  new URL(
    "../packages/framework/src/modules/services-grid/index.astro",
    import.meta.url,
  ),
);
const source = readFileSync(modulePath, "utf8");

async function renderWithStyle(style?: "icon" | "cover" | "thumb"): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(ServicesGrid, {
    props: {
      variant: "three-col",
      items: [
        { image, heading: "A", body: "<p>a</p>" },
        { image, heading: "B", body: "<p>b</p>" },
        { image, heading: "C", body: "<p>c</p>" },
      ],
      ...(style ? { dials: { imageStyle: style } } : {}),
    },
  });
}

describe("UAT AC-777: services-grid imageStyle dial tags cards, defaulting to icon", () => {
  it("test_UAT_AC777_services_grid_imageStyle_dial_tags_cards_default_icon", async () => {
    // Each dial value tags the section with its matching modifier class.
    for (const style of ["icon", "cover", "thumb"] as const) {
      const html = await renderWithStyle(style);
      expect(
        html,
        `imageStyle=${style} emits its modifier class`,
      ).toMatch(new RegExp(`fc-services-grid--image-${style}`));
    }

    // Dial omitted → defaults to the icon image-style class.
    const defaulted = await renderWithStyle();
    expect(defaulted).toMatch(/fc-services-grid--image-icon/);

    // The modifier classes drive distinct image sizing within the card:
    // icon (small square pictogram), thumb (fixed ~6rem square), cover (16:9 banner).
    expect(source).toMatch(
      /\.fc-services-grid--image-icon\s+\.fc-services-grid__image\s*\{[^}]*width:\s*2\.5rem/,
    );
    expect(source).toMatch(
      /\.fc-services-grid--image-thumb\s+\.fc-services-grid__image\s*\{[^}]*width:\s*6rem/,
    );
    expect(source).toMatch(
      /\.fc-services-grid--image-cover\s+\.fc-services-grid__image\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9/,
    );
  });
});
