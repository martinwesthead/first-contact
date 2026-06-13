import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createHandlerHarness,
  readAllLeads,
  type HandlerHarness,
} from "./_helpers_REQ-7_handler.js";

describe("UAT FC REQ-7: non-JSON content-type rejected with INVALID_CONTENT_TYPE", () => {
  let h: HandlerHarness;
  beforeEach(async () => {
    h = await createHandlerHarness();
  });
  afterEach(async () => {
    await h.cleanup();
  });

  it("returns 400 with error=INVALID_CONTENT_TYPE on form-encoded POST and writes no row", async () => {
    const resp = await h.call(null, {
      headers: { "content-type": "application/x-www-form-urlencoded" },
      bodyOverride: "email=a%40b.com",
    });
    expect(resp.status).toBe(400);
    const body = (await resp.json()) as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toBe("INVALID_CONTENT_TYPE");
    expect(await readAllLeads(h.test)).toHaveLength(0);
  });
});
