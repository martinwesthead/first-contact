import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createHandlerHarness,
  type HandlerHarness,
} from "./_helpers_REQ-7_handler.js";

describe("UAT FC REQ-7: success response includes lead_id matching the persisted row", () => {
  let h: HandlerHarness;
  beforeEach(async () => {
    h = await createHandlerHarness();
  });
  afterEach(async () => {
    await h.cleanup();
  });

  it("returns success:true with the generated lead_id", async () => {
    const resp = await h.call(
      { email: "a@b.com", turnstile_token: "ok" },
      { deps: { generateId: () => "01HXEXAMPLEFAKELEADID" } },
    );
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as {
      success: boolean;
      lead_id: string;
      message: string;
    };
    expect(body.success).toBe(true);
    expect(body.lead_id).toBe("01HXEXAMPLEFAKELEADID");
    expect(body.message).toMatch(/Thanks/);
  });
});
