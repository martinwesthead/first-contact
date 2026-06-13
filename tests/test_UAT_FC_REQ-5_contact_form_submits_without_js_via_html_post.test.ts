import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ContactForm from "../packages/framework/src/modules/contact-form/index.astro";

// With JS disabled, the browser POSTs the form natively to `action` and
// navigates to the server's response. We verify this contract is intact by
// asserting the rendered HTML carries a real <form method="post" action=...>
// with a submit button — no client-only enhancement is required for the form
// to be usable.
describe("UAT FC REQ-5: contact-form submits without JS via HTML POST", () => {
  it("renders a real <form> with method=post, action, and a submit button", async () => {
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

    // No client-side opt-out attribute, no inline onsubmit handler — pure HTML.
    expect(html).not.toMatch(/onsubmit=/);
  });
});
