import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createHandlerHarness,
  readAllLeads,
  type HandlerHarness,
} from "./_helpers_REQ-7_handler.js";

describe("UAT FC REQ-7: missing email rejected with MISSING_FIELD", () => {
  let h: HandlerHarness;
  beforeEach(async () => {
    h = await createHandlerHarness();
  });
  afterEach(async () => {
    await h.cleanup();
  });

  it("returns 400 MISSING_FIELD when email is absent and writes no row", async () => {
    const resp = await h.call({ name: "Ada", turnstile_token: "ok" });
    expect(resp.status).toBe(400);
    const body = (await resp.json()) as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toBe("MISSING_FIELD");
    expect(await readAllLeads(h.test)).toHaveLength(0);
  });
});
