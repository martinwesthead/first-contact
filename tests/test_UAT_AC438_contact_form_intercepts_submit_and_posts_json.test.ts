// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { enhanceContactForm } from "../packages/framework/src/modules/contact-form/client.js";

describe("UAT AC-438: contact-form intercepts submit and posts JSON to action URL", () => {
  it("test_UAT_AC438_contact_form_intercepts_submit_and_posts_json", async () => {
    document.body.innerHTML = `
      <div data-fc-contact-form-root>
        <form data-fc-contact-form method="post" action="/api/forms/contact">
          <input name="name" value="Ada" />
          <input name="email" value="ada@example.com" />
          <textarea name="message">Hello</textarea>
          <button type="submit">Send</button>
        </form>
      </div>
    `;
    const form = document.querySelector<HTMLFormElement>("form[data-fc-contact-form]")!;

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
    expect(body).toEqual({
      name: "Ada",
      email: "ada@example.com",
      message: "Hello",
    });
  });
});
