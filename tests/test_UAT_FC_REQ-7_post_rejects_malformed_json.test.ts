import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createHandlerHarness,
  readAllLeads,
  type HandlerHarness,
} from "./_helpers_REQ-7_handler.js";

describe("UAT FC REQ-7: malformed JSON body rejected with INVALID_JSON", () => {
  let h: HandlerHarness;
  beforeEach(async () => {
    h = await createHandlerHarness();
  });
  afterEach(async () => {
    await h.cleanup();
  });

  it("returns 400 with error=INVALID_JSON when the body is not parseable JSON", async () => {
    const resp = await h.call(null, { bodyOverride: "not json at all" });
    expect(resp.status).toBe(400);
    const body = (await resp.json()) as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toBe("INVALID_JSON");
    expect(await readAllLeads(h.test)).toHaveLength(0);
  });
});
