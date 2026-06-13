// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { enhanceContactForm } from "../packages/framework/src/modules/contact-form/client.js";

describe("UAT FC REQ-5: contact-form client renders error on non-200", () => {
  it("shows an inline error and keeps the form in place when the server returns 500", async () => {
    document.body.innerHTML = `
      <div data-fc-contact-form-root>
        <form data-fc-contact-form method="post" action="/api/forms/contact">
          <input name="email" value="x@y.com" />
          <button type="submit">Send</button>
        </form>
      </div>
    `;
    const root = document.querySelector<HTMLElement>("[data-fc-contact-form-root]")!;
    const form = root.querySelector<HTMLFormElement>("form[data-fc-contact-form]")!;

    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: "Mail provider down" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    enhanceContactForm(form, { fetch: fetchMock as unknown as typeof fetch });

    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(root.querySelector("form[data-fc-contact-form]")).not.toBeNull();
    const errorEl = form.querySelector(".fc-contact-form__error");
    expect(errorEl).not.toBeNull();
    expect(errorEl?.textContent).toContain("Mail provider down");
    expect(errorEl?.getAttribute("role")).toBe("alert");
  });
});
