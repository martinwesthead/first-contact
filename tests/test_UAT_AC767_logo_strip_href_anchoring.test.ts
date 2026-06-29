import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import LogoStrip from "../packages/framework/src/modules/logo-strip/index.astro";

const validImage = { id: "i1", src: "/assets/logo.png", alt: "Acme" };

/**
 * AC-767: Item linking is driven by the `href` field. An item with an internal
 * `href` is wrapped in an `<a>` carrying that href and no new-tab attributes.
 * An item with an external `href` (http://, https://, or protocol-relative //)
 * additionally carries `target="_blank"` and `rel="noopener noreferrer"`. An
 * item with no `href` is rendered as a non-link container (no `<a>`).
 */
describe("UAT AC-767: logo-strip wraps an item with an href in an anchor, marking external links safe", () => {
  it("test_UAT_AC767_internal_href_anchors_external_href_marks_safe_and_no_href_is_unlinked", async () => {
    const container = await AstroContainer.create();

    // Internal href → wrapped in <a href="/about"> with no new-tab attributes.
    const internal = await container.renderToString(LogoStrip, {
      props: {
        variant: "logos",
        items: [{ image: validImage, href: "/about" }],
      },
    });
    expect(internal).toMatch(/<a[^>]*href="\/about"/);
    expect(internal).not.toContain('target="_blank"');
    expect(internal).not.toContain("noopener");

    // External href → anchor carries safe new-tab attributes.
    const external = await container.renderToString(LogoStrip, {
      props: {
        variant: "logos",
        items: [{ image: validImage, href: "https://acme.com" }],
      },
    });
    expect(external).toMatch(/<a[^>]*href="https:\/\/acme\.com"/);
    expect(external).toContain('target="_blank"');
    expect(external).toContain('rel="noopener noreferrer"');

    // No href → no anchor wraps the item.
    const noHref = await container.renderToString(LogoStrip, {
      props: { variant: "logos", items: [{ image: validImage }] },
    });
    expect(noHref).not.toMatch(/<a\b/);
  });
});
