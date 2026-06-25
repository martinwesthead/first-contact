import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createHandlerHarness,
  readAllLeads,
  type HandlerHarness,
} from "./_helpers_REQ-7_handler.js";

describe("UAT AC-467: Submission with non-application/json content-type is rejected with 400 INVALID_CONTENT_TYPE", () => {
  let h: HandlerHarness;
  beforeEach(async () => {
    h = await createHandlerHarness();
  });
  afterEach(async () => {
    await h.cleanup();
  });

  it("test_UAT_AC467_non_json_content_type_rejected", async () => {
    // text/plain rejected.
    const respPlain = await h.call(null, {
      headers: { "content-type": "text/plain" },
      bodyOverride: "email=a@b.com",
    });
    expect(respPlain.status).toBe(400);
    const bodyPlain = (await respPlain.json()) as {
      success: boolean;
      error: string;
      message: string;
    };
    expect(bodyPlain.success).toBe(false);
    expect(bodyPlain.error).toBe("INVALID_CONTENT_TYPE");
    expect(bodyPlain.message).toMatch(/.+/);

    // form-encoded also rejected.
    const respForm = await h.call(null, {
      headers: { "content-type": "application/x-www-form-urlencoded" },
      bodyOverride: "email=a%40b.com",
    });
    expect(respForm.status).toBe(400);
    const bodyForm = (await respForm.json()) as { error: string };
    expect(bodyForm.error).toBe("INVALID_CONTENT_TYPE");

    // No lead rows and no Resend calls.
    expect(await readAllLeads(h.test)).toHaveLength(0);
    expect(h.fetchMock.findCall((u) => u.includes("resend.test"))).toBeUndefined();
  });
});
