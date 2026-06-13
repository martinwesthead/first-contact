import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createHandlerHarness,
  readAllLeads,
  type HandlerHarness,
} from "./_helpers_REQ-7_handler.js";

describe("UAT FC REQ-7: malformed email rejected with INVALID_EMAIL", () => {
  let h: HandlerHarness;
  beforeEach(async () => {
    h = await createHandlerHarness();
  });
  afterEach(async () => {
    await h.cleanup();
  });

  it("returns 400 INVALID_EMAIL when the email is not RFC-shaped", async () => {
    const resp = await h.call({ email: "not-an-email", turnstile_token: "ok" });
    expect(resp.status).toBe(400);
    const body = (await resp.json()) as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toBe("INVALID_EMAIL");
    expect(await readAllLeads(h.test)).toHaveLength(0);
  });
});
