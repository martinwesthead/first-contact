import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createHandlerHarness,
  readAllLeads,
  type HandlerHarness,
} from "./_helpers_REQ-7_handler.js";

describe("UAT AC-468: Submission with malformed JSON body is rejected with 400 INVALID_JSON", () => {
  let h: HandlerHarness;
  beforeEach(async () => {
    h = await createHandlerHarness();
  });
  afterEach(async () => {
    await h.cleanup();
  });

  it("test_UAT_AC468_malformed_json_body_rejected", async () => {
    // (a) Non-JSON garbage rejected.
    const respGarbage = await h.call(null, { bodyOverride: "not-json{" });
    expect(respGarbage.status).toBe(400);
    const bodyGarbage = (await respGarbage.json()) as {
      success: boolean;
      error: string;
      message: string;
    };
    expect(bodyGarbage.success).toBe(false);
    expect(bodyGarbage.error).toBe("INVALID_JSON");
    expect(bodyGarbage.message).toMatch(/.+/);

    // (b) JSON array rejected (must be an object).
    const respArray = await h.call(null, { bodyOverride: "[1,2,3]" });
    expect(respArray.status).toBe(400);
    const bodyArray = (await respArray.json()) as { error: string };
    expect(bodyArray.error).toBe("INVALID_JSON");

    // No leads written.
    expect(await readAllLeads(h.test)).toHaveLength(0);
  });
});
