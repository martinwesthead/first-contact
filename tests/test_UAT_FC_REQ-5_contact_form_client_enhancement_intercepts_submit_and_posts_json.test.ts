// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { enhanceContactForm } from "../packages/framework/src/modules/contact-form/client.js";

function buildForm(actionUrl = "/api/forms/contact"): HTMLFormElement {
  document.body.innerHTML = `
    <div data-fc-contact-form-root>
      <form data-fc-contact-form method="post" action="${actionUrl}">
        <input name="name" value="Ada" />
        <input name="email" value="ada@example.com" />
        <textarea name="message">Hello</textarea>
        <button type="submit">Send</button>
      </form>
    </div>
  `;
  return document.querySelector<HTMLFormElement>("form[data-fc-contact-form]")!;
}

describe("UAT FC REQ-5: contact-form client enhancement intercepts submit and posts JSON", () => {
  it("calls fetch with JSON body and prevents native navigation", async () => {
    const form = buildForm("/api/forms/contact");
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    enhanceContactForm(form, { fetch: fetchMock as unknown as typeof fetch });

    const submitEvent = new Event("submit", { cancelable: true, bubbles: true });
    form.dispatchEvent(submitEvent);

    expect(submitEvent.defaultPrevented).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/forms/contact");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["content-type"]).toBe(
      "application/json",
    );

    const body = JSON.parse(init.body as string);
    expect(body).toEqual({ name: "Ada", email: "ada@example.com", message: "Hello" });
  });
});
