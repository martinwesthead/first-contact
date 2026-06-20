import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import LogoStrip from "../packages/framework/src/modules/logo-strip/index.astro";

const validImage = { id: "i1", src: "/assets/logo.png", alt: "Acme" };
const items = [
  { image: { ...validImage, id: "a" } },
  { image: { ...validImage, id: "b" } },
  { image: { ...validImage, id: "c" } },
];

describe("UAT FC REQ-43: logo-strip columns dial emits class", () => {
  it.each(["3", "4", "5", "6"] as const)(
    "dial columns=%s emits fc-logo-strip--columns-%s",
    async (columns) => {
      const container = await AstroContainer.create();
      const html = await container.renderToString(LogoStrip, {
        props: {
          variant: "logos",
          items,
          dials: { columns },
        },
      });
      expect(html).toMatch(new RegExp(`fc-logo-strip--columns-${columns}`));
    },
  );

  it("defaults columns to 4 when not provided", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(LogoStrip, {
      props: { variant: "logos", items },
    });
    expect(html).toMatch(/fc-logo-strip--columns-4/);
  });
});
