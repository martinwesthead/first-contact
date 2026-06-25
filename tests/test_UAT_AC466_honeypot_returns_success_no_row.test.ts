import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createHandlerHarness,
  readAllLeads,
  type HandlerHarness,
} from "./_helpers_REQ-7_handler.js";

describe("UAT AC-466: Submission with the honeypot field populated returns a success response but writes no lead and sends no notification", () => {
  let h: HandlerHarness;
  beforeEach(async () => {
    h = await createHandlerHarness();
  });
  afterEach(async () => {
    await h.cleanup();
  });

  it("test_UAT_AC466_honeypot_filled_returns_success_no_row_no_email", async () => {
    const resp = await h.call({
      name: "Spammer",
      email: "spam@example.com",
      message: "Buy our stuff",
      website: "https://spammer.example",
      turnstile_token: "ok",
    });

    // Indistinguishable to an attacker: success-shaped 200.
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { success: boolean };
    expect(body.success).toBe(true);

    // No DB row.
    const rows = await readAllLeads(h.test);
    expect(rows).toHaveLength(0);

    // No Resend notification dispatched.
    const resendCall = h.fetchMock.findCall((u) => u.includes("resend.test"));
    expect(resendCall).toBeUndefined();
  });
});
