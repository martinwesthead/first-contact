import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ContactForm from "../packages/framework/src/modules/contact-form/index.astro";

describe("UAT AC-434: contact-form submits to the configured action URL", () => {
  it("test_UAT_AC434_contact_form_submits_to_configured_action_url", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ContactForm, {
      props: {
        variant: "inline",
        action: "/api/forms/contact",
        fields: [{ name: "email", label: "Email", type: "email", required: true }],
      },
    });

    expect(html).toMatch(/<form[^>]+action="\/api\/forms\/contact"/);

    // Repeat with a different action URL to ensure the value is dynamic.
    const html2 = await container.renderToString(ContactForm, {
      props: {
        variant: "inline",
        action: "https://example.com/leads",
        fields: [{ name: "email", label: "Email", type: "email", required: true }],
      },
    });
    expect(html2).toMatch(/<form[^>]+action="https:\/\/example\.com\/leads"/);
  });
});
