import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ContactForm from "../packages/framework/src/modules/contact-form/index.astro";

describe("UAT AC-435: contact-form renders a visually concealed honeypot input", () => {
  it("test_UAT_AC435_contact_form_renders_hidden_honeypot_input", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ContactForm, {
      props: {
        variant: "inline",
        action: "/api/forms/contact",
        fields: [{ name: "email", label: "Email", type: "email", required: true }],
      },
    });

    // Honeypot container is present and aria-hidden.
    expect(html).toMatch(
      /<div[^>]+class="[^"]*fc-contact-form__honeypot[^"]*"[^>]+aria-hidden="true"/,
    );

    // Honeypot input itself is present, with tabindex=-1 to exclude from tab order.
    expect(html).toMatch(/<input[^>]+data-fc-honeypot/);
    expect(html).toMatch(/<input[^>]+tabindex="-1"/);
    expect(html).toMatch(/<input[^>]+name="website"/);
  });
});
