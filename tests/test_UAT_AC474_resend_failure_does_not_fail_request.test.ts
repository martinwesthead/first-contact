import { afterEach, describe, expect, it } from "vitest";
import {
  createHandlerHarness,
  readAllLeads,
  type HandlerHarness,
} from "./_helpers_REQ-7_handler.js";

describe("UAT AC-474: Best-effort owner notification failures do not fail the request — the lead is persisted and the response is 200", () => {
  let h: HandlerHarness;
  afterEach(async () => {
    await h.cleanup();
  });

  it("test_UAT_AC474_resend_failure_does_not_fail_request", async () => {
    // Variant 1: Resend returns 500 — request still succeeds.
    h = await createHandlerHarness();
    h.fetchMock.addHandler((url) => {
      if (url.includes("resend.test/emails")) {
        return new Response(JSON.stringify({ error: "boom" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
      return null;
    });
    const respStatusError = await h.call({
      name: "Ada",
      email: "ada@example.com",
      message: "Hi",
      turnstile_token: "ok",
    });
    expect(respStatusError.status).toBe(200);
    const bodyStatusError = (await respStatusError.json()) as {
      success: boolean;
      lead_id: string;
    };
    expect(bodyStatusError.success).toBe(true);
    expect(bodyStatusError.lead_id).toMatch(/.+/);
    let rows = await readAllLeads(h.test);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.email).toBe("ada@example.com");
    // Notification endpoint was invoked.
    expect(h.fetchMock.findCall((u) => u.includes("resend.test"))).toBeDefined();
    await h.cleanup();

    // Variant 2: Resend throws (simulated network failure) — request still succeeds.
    h = await createHandlerHarness();
    h.fetchMock.addHandler((url) => {
      if (url.includes("resend.test/emails")) {
        throw new Error("network down");
      }
      return null;
    });
    const respNetworkError = await h.call({
      name: "Grace",
      email: "grace@example.com",
      message: "Hello there",
      turnstile_token: "ok",
    });
    expect(respNetworkError.status).toBe(200);
    const bodyNetworkError = (await respNetworkError.json()) as {
      success: boolean;
      lead_id: string;
    };
    expect(bodyNetworkError.success).toBe(true);
    expect(bodyNetworkError.lead_id).toMatch(/.+/);
    rows = await readAllLeads(h.test);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.email).toBe("grace@example.com");
  });
});
