import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import { Header } from "@1stcontact/framework";

describe("UAT FC REQ-4: header collapses below md breakpoint", () => {
  it("renders the responsive toggle and nav region linked by aria-controls", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Header, {
      props: {
        logo: "Acme",
        entries: [
          { label: "Home", target: { kind: "page", pageId: "home" } },
        ],
      },
    });

    expect(html).toMatch(/<button[^>]+data-fc-header-toggle/);
    expect(html).toMatch(/aria-controls="fc-header-nav"/);
    expect(html).toMatch(/aria-expanded="false"/);
    expect(html).toMatch(/<nav[^>]+id="fc-header-nav"/);
  });
});
