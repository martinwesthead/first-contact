// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bootBuilder,
  clearToolResultRenderers,
  getRegisteredToolResultRenderer,
} from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { MemoryStorage } from "./_helpers_REQ-8_storage.js";

describe("UAT FC BUG-4: bootBuilder wires ConvertConfirmation card + listener bridge", () => {
  beforeEach(() => {
    clearToolResultRenderers();
  });
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("registers the convert_confirmation tool_result renderer at boot", () => {
    expect(getRegisteredToolResultRenderer("convert_confirmation")).toBeUndefined();

    const { destroy } = bootBuilder({
      root: document.body,
      initialSite: load1stContactSite(),
      storage: new MemoryStorage(),
    });

    expect(getRegisteredToolResultRenderer("convert_confirmation")).toBeTypeOf(
      "function",
    );

    destroy();
  });

  it("dispatching fc:convert-confirmed drives a chat turn whose user message confirms the URL", async () => {
    const fetchCalls: Array<{ url: string; body: unknown }> = [];
    const fetchStub = vi.fn(async (input: unknown, init?: unknown) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : (input as Request).url;
      const initBody = (init as { body?: string } | undefined)?.body;
      fetchCalls.push({
        url,
        body: typeof initBody === "string" ? JSON.parse(initBody) : null,
      });
      return new Response(JSON.stringify({ text: "ok", toolCalls: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    globalThis.fetch = fetchStub as unknown as typeof fetch;

    const { destroy } = bootBuilder({
      root: document.body,
      initialSite: load1stContactSite(),
      storage: new MemoryStorage(),
      chatEndpoint: "/api/chat",
    });

    const event = new CustomEvent("fc:convert-confirmed", {
      detail: { url: "https://acme.test/", ownsSite: false },
      bubbles: true,
    });
    document.dispatchEvent(event);

    // runChatTurn is async (awaits fetch). Microtask flush.
    await new Promise((r) => setTimeout(r, 0));

    expect(fetchStub).toHaveBeenCalledTimes(1);
    const call = fetchCalls[0]!;
    expect(call.url).toBe("/api/chat");
    const body = call.body as { history: Array<{ role: string; content: string }> };
    const lastUser = body.history[body.history.length - 1]!;
    expect(lastUser.role).toBe("user");
    expect(lastUser.content).toContain("I confirm");
    expect(lastUser.content).toContain("https://acme.test/");
    expect(lastUser.content).not.toContain("I own this site");

    destroy();
  });

  it("dispatching fc:convert-confirmed with ownsSite=true includes ownership clause", async () => {
    const fetchCalls: Array<{ body: unknown }> = [];
    globalThis.fetch = vi.fn(async (_input: unknown, init?: unknown) => {
      const initBody = (init as { body?: string } | undefined)?.body;
      fetchCalls.push({
        body: typeof initBody === "string" ? JSON.parse(initBody) : null,
      });
      return new Response(JSON.stringify({ text: "ok", toolCalls: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const { destroy } = bootBuilder({
      root: document.body,
      initialSite: load1stContactSite(),
      storage: new MemoryStorage(),
    });

    document.dispatchEvent(
      new CustomEvent("fc:convert-confirmed", {
        detail: { url: "https://acme.test/", ownsSite: true },
        bubbles: true,
      }),
    );
    await new Promise((r) => setTimeout(r, 0));

    const body = fetchCalls[0]!.body as {
      history: Array<{ role: string; content: string }>;
    };
    const lastUser = body.history[body.history.length - 1]!;
    expect(lastUser.content).toContain("I own this site");

    destroy();
  });

  it("dispatching fc:convert-cancelled drives a chat turn whose user message cancels the conversion", async () => {
    const fetchCalls: Array<{ body: unknown }> = [];
    globalThis.fetch = vi.fn(async (_input: unknown, init?: unknown) => {
      const initBody = (init as { body?: string } | undefined)?.body;
      fetchCalls.push({
        body: typeof initBody === "string" ? JSON.parse(initBody) : null,
      });
      return new Response(JSON.stringify({ text: "ok", toolCalls: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const { destroy } = bootBuilder({
      root: document.body,
      initialSite: load1stContactSite(),
      storage: new MemoryStorage(),
    });

    document.dispatchEvent(
      new CustomEvent("fc:convert-cancelled", {
        detail: { url: "https://acme.test/" },
        bubbles: true,
      }),
    );
    await new Promise((r) => setTimeout(r, 0));

    const body = fetchCalls[0]!.body as {
      history: Array<{ role: string; content: string }>;
    };
    const lastUser = body.history[body.history.length - 1]!;
    expect(lastUser.role).toBe("user");
    expect(lastUser.content).toMatch(/Cancel the conversion/i);
    expect(lastUser.content).toContain("https://acme.test/");

    destroy();
  });

  it("destroy() removes the convert-confirmed and convert-cancelled listeners", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(JSON.stringify({ text: "ok", toolCalls: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    globalThis.fetch = fetchStub as unknown as typeof fetch;

    const { destroy } = bootBuilder({
      root: document.body,
      initialSite: load1stContactSite(),
      storage: new MemoryStorage(),
    });
    destroy();

    document.dispatchEvent(
      new CustomEvent("fc:convert-confirmed", {
        detail: { url: "https://acme.test/", ownsSite: false },
        bubbles: true,
      }),
    );
    document.dispatchEvent(
      new CustomEvent("fc:convert-cancelled", {
        detail: { url: "https://acme.test/" },
        bubbles: true,
      }),
    );
    await new Promise((r) => setTimeout(r, 0));

    expect(fetchStub).not.toHaveBeenCalled();
  });
});
