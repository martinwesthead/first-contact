// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { enhanceContactForm } from "../packages/framework/src/modules/contact-form/client.js";

describe("UAT FC REQ-5: contact-form client renders success message on 200", () => {
  it("replaces the form with the success message embedded in the template", async () => {
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
  });
});
