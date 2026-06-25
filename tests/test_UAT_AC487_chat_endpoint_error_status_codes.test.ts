import { describe, expect, it, vi } from "vitest";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import { buildFrameworkCatalog } from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

function makeRequest(): Request {
  return new Request("https://app.1stcontact.io/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      history: [{ role: "user", content: "hi" }],
      siteDefinition: load1stContactSite(),
      frameworkCatalog: buildFrameworkCatalog(),
    }),
  });
}

describe("UAT AC-487: POST /api/chat returns 500 when API key is missing and 502 when the upstream call fails", () => {
  it("test_UAT_AC487_chat_endpoint_returns_500_when_key_missing_and_502_on_upstream_errors", async () => {
    // Case 1: no CLAUDE_API_KEY in env → 500 with error mentioning CLAUDE_API_KEY.
    const noKeyResponse = await handleChatRequest(makeRequest(), {}, {});
    expect(noKeyResponse.status).toBe(500);
    const noKeyBody = (await noKeyResponse.json()) as { error: string };
    expect(noKeyBody.error).toMatch(/CLAUDE_API_KEY/);

    // Case 2: key bound, upstream fetch throws (network/transport failure) → 502.
    const throwFetch = vi.fn(async () => {
      throw new Error("network down");
    });
    const throwResponse = await handleChatRequest(
      makeRequest(),
      { CLAUDE_API_KEY: "test-key-abc" },
      { fetch: throwFetch as unknown as typeof fetch, log: () => {} },
    );
    expect(throwResponse.status).toBe(502);
    const throwBody = (await throwResponse.json()) as { error: string };
    expect(typeof throwBody.error).toBe("string");
    expect(throwBody.error.length).toBeGreaterThan(0);

    // Case 3: key bound, upstream returns a non-2xx (e.g. 503) → 502.
    const nonOkFetch = vi.fn(async () =>
      new Response("upstream busy", {
        status: 503,
        headers: { "content-type": "text/plain" },
      }),
    );
    const nonOkResponse = await handleChatRequest(
      makeRequest(),
      { CLAUDE_API_KEY: "test-key-abc" },
      { fetch: nonOkFetch as unknown as typeof fetch, log: () => {} },
    );
    expect(nonOkResponse.status).toBe(502);
    const nonOkBody = (await nonOkResponse.json()) as { error: string };
    expect(typeof nonOkBody.error).toBe("string");
    expect(nonOkBody.error.length).toBeGreaterThan(0);
  });
});
