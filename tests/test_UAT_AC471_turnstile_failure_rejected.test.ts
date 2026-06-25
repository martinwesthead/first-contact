import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createHandlerHarness,
  readAllLeads,
  type HandlerHarness,
} from "./_helpers_REQ-7_handler.js";

describe("UAT AC-471: When Turnstile is configured, a submission whose token fails verification is rejected with 400 TURNSTILE_FAILED and writes no lead and sends no notification", () => {
  let h: HandlerHarness;
  afterEach(async () => {
    await h.cleanup();
  });

  it("test_UAT_AC471_failed_or_missing_turnstile_rejected", async () => {
    // Variant 1: siteverify returns success:false.
    h = await createHandlerHarness();
    h.fetchMock.addHandler((url) => {
      if (url.includes("siteverify")) {
        return new Response(JSON.stringify({ success: false }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return null;
    });
    const respFail = await h.call({
      name: "Ada",
      email: "ada@example.com",
      message: "Hello",
      turnstile_token: "tok-but-invalid",
    });
    expect(respFail.status).toBe(400);
    const bodyFail = (await respFail.json()) as {
      success: boolean;
      error: string;
      message: string;
    };
    expect(bodyFail.success).toBe(false);
    expect(bodyFail.error).toBe("TURNSTILE_FAILED");
    expect(bodyFail.message).toMatch(/.+/);
    expect(await readAllLeads(h.test)).toHaveLength(0);
    expect(h.fetchMock.findCall((u) => u.includes("resend.test"))).toBeUndefined();
    await h.cleanup();

    // Variant 2: turnstile_token missing entirely from the body.
    h = await createHandlerHarness();
    const respMissing = await h.call({
      name: "Ada",
      email: "ada@example.com",
      message: "Hello",
    });
    expect(respMissing.status).toBe(400);
    expect(((await respMissing.json()) as { error: string }).error).toBe(
      "TURNSTILE_FAILED",
    );
    expect(await readAllLeads(h.test)).toHaveLength(0);
    expect(h.fetchMock.findCall((u) => u.includes("resend.test"))).toBeUndefined();
  });
});
