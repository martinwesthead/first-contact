// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { enhanceContactForm } from "../packages/framework/src/modules/contact-form/client.js";

interface TurnstileGlobal {
  getResponse: (widget: HTMLElement | string) => string | undefined;
}

function renderContactForm(includeTurnstileTarget: boolean): HTMLFormElement {
  const turnstileMount = includeTurnstileTarget
    ? `<div data-turnstile-target></div>`
    : "";
  document.body.innerHTML = `
    <div data-fc-contact-form-root>
      <form data-fc-contact-form method="post" action="/api/forms/contact">
        <input name="email" value="a@b.com" />
        ${turnstileMount}
        <button type="submit">Send</button>
      </form>
    </div>
  `;
  return document.querySelector<HTMLFormElement>("form[data-fc-contact-form]")!;
}

function clearTurnstileGlobal(): void {
  delete (window as unknown as { turnstile?: unknown }).turnstile;
}

describe("UAT AC-476: Contact-form client island attaches the Turnstile response token to its JSON submission when a Turnstile widget is rendered", () => {
  it("test_UAT_AC476_island_includes_or_omits_turnstile_token", async () => {
    // (a) Turnstile widget rendered + global available → token attached.
    clearTurnstileGlobal();
    const formWith = renderContactForm(true);
    (window as unknown as { turnstile: TurnstileGlobal }).turnstile = {
      getResponse: () => "test-token",
    };
    const fetchWith = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    enhanceContactForm(formWith, {
      fetch: fetchWith as unknown as typeof fetch,
    });
    formWith.dispatchEvent(
      new Event("submit", { cancelable: true, bubbles: true }),
    );
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(fetchWith).toHaveBeenCalledTimes(1);
    const [, initWith] = fetchWith.mock.calls[0] as [string, RequestInit];
    const bodyWith = JSON.parse(initWith.body as string);
    expect(bodyWith.turnstile_token).toBe("test-token");

    // (b) No Turnstile widget rendered → no turnstile_token key on the body.
    clearTurnstileGlobal();
    const formWithout = renderContactForm(false);
    const fetchWithout = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    enhanceContactForm(formWithout, {
      fetch: fetchWithout as unknown as typeof fetch,
    });
    formWithout.dispatchEvent(
      new Event("submit", { cancelable: true, bubbles: true }),
    );
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(fetchWithout).toHaveBeenCalledTimes(1);
    const [, initWithout] = fetchWithout.mock.calls[0] as [string, RequestInit];
    const bodyWithout = JSON.parse(initWithout.body as string);
    expect(bodyWithout).not.toHaveProperty("turnstile_token");
  });
});
