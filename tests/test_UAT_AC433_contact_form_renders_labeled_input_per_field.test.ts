import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ContactForm from "../packages/framework/src/modules/contact-form/index.astro";

describe("UAT AC-433: contact-form renders one labeled input per field with the right type/name/required", () => {
  it("test_UAT_AC433_contact_form_renders_labeled_input_per_field", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ContactForm, {
      props: {
        variant: "inline",
        action: "/api/forms/contact",
        fields: [
          { name: "name", label: "Your name", type: "text", required: true },
          { name: "email", label: "Email", type: "email", required: true },
          { name: "phone", label: "Phone", type: "tel", required: false },
          { name: "message", label: "Message", type: "textarea", required: false },
        ],
      },
    });

    // Each declared field has a <label> whose `for` references the input id,
    // and the label text contains the declared label string.
    expect(html).toMatch(
      /<label[^>]*for="fc-contact-name"[^>]*>\s*Your name/,
    );
    expect(html).toMatch(/<label[^>]*for="fc-contact-email"[^>]*>\s*Email/);
    expect(html).toMatch(/<label[^>]*for="fc-contact-phone"[^>]*>\s*Phone/);
    expect(html).toMatch(/<label[^>]*for="fc-contact-message"[^>]*>\s*Message/);

    // Each field renders the appropriate element with the right type/name.
    expect(html).toMatch(
      /<input[^>]*id="fc-contact-name"[^>]*name="name"[^>]*type="text"/,
    );
    expect(html).toMatch(
      /<input[^>]*id="fc-contact-email"[^>]*name="email"[^>]*type="email"/,
    );
    expect(html).toMatch(
      /<input[^>]*id="fc-contact-phone"[^>]*name="phone"[^>]*type="tel"/,
    );
    expect(html).toMatch(
      /<textarea[^>]*id="fc-contact-message"[^>]*name="message"/,
    );

    // Exactly one input per non-textarea field (excluding the honeypot, which
    // uses name="website"). We count inputs whose name matches each field.
    const fieldNames = ["name", "email", "phone"];
    for (const fieldName of fieldNames) {
      const matches = html.match(
        new RegExp(`<input[^>]+name="${fieldName}"`, "g"),
      );
      expect(matches?.length ?? 0).toBe(1);
    }
    const textareaMatches = html.match(/<textarea[^>]+name="message"/g);
    expect(textareaMatches?.length ?? 0).toBe(1);

    // Required attribute is present on required inputs and absent on optional ones.
    expect(html).toMatch(/<input[^>]*name="name"[^>]*required\b/);
    expect(html).toMatch(/<input[^>]*name="email"[^>]*required\b/);
    expect(html).not.toMatch(/<input[^>]*name="phone"[^>]*required\b/);
    expect(html).not.toMatch(/<textarea[^>]*name="message"[^>]*required\b/);
  });
});
