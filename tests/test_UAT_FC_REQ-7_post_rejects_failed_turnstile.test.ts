import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createHandlerHarness,
  readAllLeads,
  type HandlerHarness,
} from "./_helpers_REQ-7_handler.js";

describe("UAT FC REQ-7: Turnstile failure rejected with TURNSTILE_FAILED and no DB write", () => {
  let h: HandlerHarness;
  beforeEach(async () => {
    h = await createHandlerHarness();
    // Override the default Turnstile mock to always fail.
    h.fetchMock.addHandler((url) => {
      if (url.includes("siteverify")) {
        return new Response(JSON.stringify({ success: false }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return null;
    });
  });
  afterEach(async () => {
    await h.cleanup();
  });

  it("returns 400 TURNSTILE_FAILED, no lead row, no Resend call", async () => {
    const resp = await h.call({ email: "a@b.com", turnstile_token: "bad" });
    expect(resp.status).toBe(400);
    const body = (await resp.json()) as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toBe("TURNSTILE_FAILED");
    expect(await readAllLeads(h.test)).toHaveLength(0);

    const resendCall = h.fetchMock.findCall((u) => u.includes("resend.test"));
    expect(resendCall).toBeUndefined();
  });
});
