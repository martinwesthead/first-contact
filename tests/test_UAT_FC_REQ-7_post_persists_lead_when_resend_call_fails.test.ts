import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createHandlerHarness,
  readAllLeads,
  type HandlerHarness,
} from "./_helpers_REQ-7_handler.js";

describe("UAT FC REQ-7: Resend failure does not fail the request", () => {
  let h: HandlerHarness;
  beforeEach(async () => {
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
  });
  afterEach(async () => {
    await h.cleanup();
  });

  it("returns 200 success and the lead row exists even when Resend returns 500", async () => {
    const resp = await h.call({ email: "a@b.com", turnstile_token: "ok" });
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { success: boolean; lead_id: string };
    expect(body.success).toBe(true);

    const rows = await readAllLeads(h.test);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.email).toBe("a@b.com");

    // Resend was called (and failed) — we don't fail the request because of it.
    const resendCall = h.fetchMock.findCall((u) => u.includes("resend.test"));
    expect(resendCall).toBeDefined();
  });
});
