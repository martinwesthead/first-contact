// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { enhanceContactForm } from "../packages/framework/src/modules/contact-form/client.js";

describe("UAT AC-439: contact-form replaces itself with success message on 2xx", () => {
  it("test_UAT_AC439_contact_form_replaces_with_success_message_on_2xx", async () => {
    // Case 1: Configured success message renders into the DOM in place of the form.
    document.body.innerHTML = `
      <div data-fc-contact-form-root>
        <form data-fc-contact-form method="post" action="/api/forms/contact">
          <input name="email" value="x@y.com" />
          <button type="submit">Send</button>
        </form>
        <template data-fc-success-message><p>Thanks, we'll be in touch shortly.</p></template>
      </div>
    `;
    const root = document.querySelector<HTMLElement>("[data-fc-contact-form-root]")!;
    const form = root.querySelector<HTMLFormElement>("form[data-fc-contact-form]")!;

    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response("{}", { status: 200 })),
    );
    enhanceContactForm(form, { fetch: fetchMock as unknown as typeof fetch });

    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(root.querySelector("form[data-fc-contact-form]")).toBeNull();
    const success = root.querySelector(".fc-contact-form__success");
    expect(success).not.toBeNull();
    expect(success?.innerHTML).toContain("Thanks, we'll be in touch shortly.");
    expect(success?.getAttribute("role")).toBe("status");

    // Case 2: Without a configured success template, a non-empty default thank-you appears.
    document.body.innerHTML = `
      <div data-fc-contact-form-root>
        <form data-fc-contact-form method="post" action="/api/forms/contact">
          <input name="email" value="x@y.com" />
          <button type="submit">Send</button>
        </form>
      </div>
    `;
    const root2 = document.querySelector<HTMLElement>("[data-fc-contact-form-root]")!;
    const form2 = root2.querySelector<HTMLFormElement>("form[data-fc-contact-form]")!;

    const fetchMock2 = vi.fn(() =>
      Promise.resolve(new Response("{}", { status: 200 })),
    );
    enhanceContactForm(form2, { fetch: fetchMock2 as unknown as typeof fetch });

    form2.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(root2.querySelector("form[data-fc-contact-form]")).toBeNull();
    const success2 = root2.querySelector(".fc-contact-form__success");
    expect(success2).not.toBeNull();
    expect(success2?.textContent?.trim().length ?? 0).toBeGreaterThan(0);
  });
});
