// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { enhanceContactForm } from "../packages/framework/src/modules/contact-form/client.js";

interface TurnstileGlobal {
  getResponse: (widget: HTMLElement | string) => string | undefined;
}

function buildFormWithTurnstile(token: string | undefined): HTMLFormElement {
  document.body.innerHTML = `
    <div data-fc-contact-form-root>
      <form data-fc-contact-form method="post" action="/api/forms/contact">
        <input name="email" value="a@b.com" />
        <div data-turnstile-target></div>
        <button type="submit">Send</button>
      </form>
    </div>
  `;
  (window as unknown as { turnstile: TurnstileGlobal }).turnstile = {
    getResponse: () => token,
  };
  return document.querySelector<HTMLFormElement>("form[data-fc-contact-form]")!;
}

describe("UAT FC REQ-7: contact-form island attaches the Turnstile token on submit", () => {
  it("calls window.turnstile.getResponse and includes turnstile_token in the JSON body", async () => {
    const form = buildFormWithTurnstile("tok-abc-123");
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    enhanceContactForm(form, { fetch: fetchMock as unknown as typeof fetch });
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));

    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.turnstile_token).toBe("tok-abc-123");
    expect(body.email).toBe("a@b.com");
  });

  it("omits turnstile_token when Turnstile has not produced a response", async () => {
    const form = buildFormWithTurnstile(undefined);
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    enhanceContactForm(form, { fetch: fetchMock as unknown as typeof fetch });
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));

    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body).not.toHaveProperty("turnstile_token");
  });
});
