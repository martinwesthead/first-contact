import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ContactForm from "../packages/framework/src/modules/contact-form/index.astro";

describe("UAT FC REQ-5: contact-form renders configured fields", () => {
  it("emits an input/textarea per field with the right label and type", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ContactForm, {
      props: {
        variant: "inline",
        action: "/api/forms/contact",
        fields: [
          { name: "name", label: "Your name", type: "text", required: true },
          { name: "email", label: "Email", type: "email", required: true },
          { name: "message", label: "Message", type: "textarea", required: false },
        ],
      },
    });

    expect(html).toMatch(
      /<label[^>]*for="fc-contact-name"[^>]*>\s*Your name/,
    );
    expect(html).toMatch(
      /<input[^>]*id="fc-contact-name"[^>]*name="name"[^>]*type="text"/,
    );

    expect(html).toMatch(/<label[^>]*for="fc-contact-email"[^>]*>\s*Email/);
    expect(html).toMatch(
      /<input[^>]*id="fc-contact-email"[^>]*name="email"[^>]*type="email"/,
    );

    expect(html).toMatch(/<label[^>]*for="fc-contact-message"[^>]*>\s*Message/);
    expect(html).toMatch(
      /<textarea[^>]*id="fc-contact-message"[^>]*name="message"/,
    );
  });
});
