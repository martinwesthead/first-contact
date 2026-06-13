import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ContactForm from "../packages/framework/src/modules/contact-form/index.astro";

describe("UAT FC REQ-5: contact-form includes honeypot hidden field", () => {
  it("emits a tabindex=-1 input tagged data-fc-honeypot inside an aria-hidden container", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ContactForm, {
      props: {
        variant: "inline",
        action: "/api/forms/contact",
        fields: [{ name: "email", label: "Email", type: "email", required: true }],
      },
    });

    expect(html).toMatch(
      /<div[^>]+class="[^"]*fc-contact-form__honeypot[^"]*"[^>]+aria-hidden="true"/,
    );
    expect(html).toMatch(/<input[^>]+data-fc-honeypot/);
    expect(html).toMatch(/<input[^>]+tabindex="-1"/);
    expect(html).toMatch(/<input[^>]+name="website"/);
  });
});
