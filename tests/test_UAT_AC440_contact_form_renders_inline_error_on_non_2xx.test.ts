// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { enhanceContactForm } from "../packages/framework/src/modules/contact-form/client.js";

function setupForm(): HTMLFormElement {
  document.body.innerHTML = `
    <div data-fc-contact-form-root>
      <form data-fc-contact-form method="post" action="/api/forms/contact">
        <input name="email" value="x@y.com" />
        <button type="submit">Send</button>
      </form>
    </div>
  `;
  return document.querySelector<HTMLFormElement>("form[data-fc-contact-form]")!;
}

describe("UAT AC-440: contact-form remains visible and surfaces inline error on non-2xx", () => {
  it("test_UAT_AC440_contact_form_renders_inline_error_on_non_2xx", async () => {
    const form = setupForm();
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: "Mail provider down" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    enhanceContactForm(form, { fetch: fetchMock as unknown as typeof fetch });

    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.querySelector("form[data-fc-contact-form]")).not.toBeNull();
    const errorEl = form.querySelector(".fc-contact-form__error");
    expect(errorEl).not.toBeNull();
    expect(errorEl?.textContent).toContain("Mail provider down");
    expect(errorEl?.getAttribute("role")).toBe("alert");

    // Repeat with a non-JSON 500 response — expect a generic failure message.
    const form2 = setupForm();
    const fetchMock2 = vi.fn(() =>
      Promise.resolve(
        new Response("oops", {
          status: 500,
          headers: { "content-type": "text/plain" },
        }),
      ),
    );
    enhanceContactForm(form2, { fetch: fetchMock2 as unknown as typeof fetch });
    form2.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.querySelector("form[data-fc-contact-form]")).not.toBeNull();
    const errorEl2 = form2.querySelector(".fc-contact-form__error");
    expect(errorEl2).not.toBeNull();
    expect(errorEl2?.textContent?.length ?? 0).toBeGreaterThan(0);
    expect(errorEl2?.textContent).toMatch(/500|fail|error/i);
  });
});
