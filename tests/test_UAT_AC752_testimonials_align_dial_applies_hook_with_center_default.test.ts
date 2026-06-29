import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import Testimonials from "../packages/framework/src/modules/testimonials/index.astro";

// AC-752: the align dial applies a matching alignment style hook. align=left
// carries the left hook and not the center hook; an unspecified align defaults
// to center, carrying the center hook and not the left hook.
describe("UAT AC-752: align dial applies a matching alignment style hook and defaults to center", () => {
  const items = [{ quote: "<p>Hello.</p>", name: "Alice" }];

  it("test_UAT_AC752_testimonials_align_dial_applies_hook_with_center_default", async () => {
    const container = await AstroContainer.create();

    // align=left carries the left hook and not the center hook.
    const left = await container.renderToString(Testimonials, {
      props: { variant: "single", items, dials: { align: "left" } },
    });
    expect(left).toMatch(/fc-testimonials--align-left/);
    expect(left).not.toMatch(/fc-testimonials--align-center/);

    // Unspecified align defaults to center: center hook present, left hook absent.
    const defaulted = await container.renderToString(Testimonials, {
      props: { variant: "single", items },
    });
    expect(defaulted).toMatch(/fc-testimonials--align-center/);
    expect(defaulted).not.toMatch(/fc-testimonials--align-left/);
  });
});
