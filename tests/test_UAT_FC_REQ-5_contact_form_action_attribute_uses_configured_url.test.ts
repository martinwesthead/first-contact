import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ContactForm from "../packages/framework/src/modules/contact-form/index.astro";

describe("UAT FC REQ-5: contact-form action attribute uses configured URL", () => {
  it("renders the form with method=post and action set to the configured URL", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ContactForm, {
      props: {
        variant: "inline",
        action: "/api/forms/contact",
        fields: [{ name: "email", label: "Email", type: "email", required: true }],
      },
    });

    expect(html).toMatch(
      /<form[^>]+method="post"[^>]+action="\/api\/forms\/contact"/,
    );
  });
});
