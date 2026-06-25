import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ContactForm from "../packages/framework/src/modules/contact-form/index.astro";

describe("UAT AC-437: contact-form submits via standard HTML POST without JS", () => {
  it("test_UAT_AC437_contact_form_submits_via_html_post_without_js", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ContactForm, {
      props: {
        variant: "inline",
        action: "/api/forms/contact",
        submitLabel: "Send message",
        fields: [
          { name: "name", label: "Name", type: "text", required: true },
          { name: "email", label: "Email", type: "email", required: true },
        ],
      },
    });

    expect(html).toMatch(
      /<form[^>]+method="post"[^>]+action="\/api\/forms\/contact"/,
    );
    expect(html).toMatch(
      /<button[^>]+type="submit"[^>]*>\s*Send message\s*<\/button>/,
    );

    // No inline JS handler or interceptor in the rendered HTML.
    expect(html).not.toMatch(/onsubmit=/);
  });
});
