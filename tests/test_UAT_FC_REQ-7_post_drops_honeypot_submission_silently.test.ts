import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createHandlerHarness,
  readAllLeads,
  type HandlerHarness,
} from "./_helpers_REQ-7_handler.js";

describe("UAT FC REQ-7: honeypot submissions are silently dropped", () => {
  let h: HandlerHarness;
  beforeEach(async () => {
    h = await createHandlerHarness();
  });
  afterEach(async () => {
    await h.cleanup();
  });

  it("returns 200 dropped:true with no DB row and no Resend call", async () => {
    const resp = await h.call({
      email: "spam@example.com",
      website: "https://spammer.example",
    });
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { success: boolean; dropped: boolean };
    expect(body.success).toBe(true);
    expect(body.dropped).toBe(true);

    expect(await readAllLeads(h.test)).toHaveLength(0);
    const resendCall = h.fetchMock.findCall((u) => u.includes("resend.test"));
    expect(resendCall).toBeUndefined();
  });
});
