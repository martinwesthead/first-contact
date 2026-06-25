import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ContactForm from "../packages/framework/src/modules/contact-form/index.astro";

describe("UAT AC-436: contact-form renders a Turnstile mount-target element", () => {
  it("test_UAT_AC436_contact_form_renders_turnstile_mount_target", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ContactForm, {
      props: {
        variant: "inline",
        action: "/api/forms/contact",
        fields: [{ name: "email", label: "Email", type: "email", required: true }],
      },
    });

    // Exactly one data-turnstile-target element exists in the form's region.
    const matches = html.match(/data-turnstile-target/g) ?? [];
    expect(matches.length).toBe(1);

    // The mount-target appears inside the rendered <form>.
    const formMatch = html.match(/<form[\s\S]*?<\/form>/);
    expect(formMatch).not.toBeNull();
    expect(formMatch![0]).toMatch(/data-turnstile-target/);
  });
});
