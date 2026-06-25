import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createHandlerHarness,
  readAllLeads,
  type HandlerHarness,
} from "./_helpers_REQ-7_handler.js";

describe("UAT AC-469: Submission missing the email field is rejected with 400 MISSING_FIELD and writes no lead", () => {
  let h: HandlerHarness;
  beforeEach(async () => {
    h = await createHandlerHarness();
  });
  afterEach(async () => {
    await h.cleanup();
  });

  it("test_UAT_AC469_missing_or_blank_email_rejected", async () => {
    // (a) Email entirely absent.
    const respAbsent = await h.call({
      name: "Alice",
      turnstile_token: "ok",
    });
    expect(respAbsent.status).toBe(400);
    const bodyAbsent = (await respAbsent.json()) as {
      success: boolean;
      error: string;
      message: string;
    };
    expect(bodyAbsent.success).toBe(false);
    expect(bodyAbsent.error).toBe("MISSING_FIELD");
    expect(bodyAbsent.message).toMatch(/.+/);

    // (b) Email is empty string.
    const respEmpty = await h.call({ email: "", turnstile_token: "ok" });
    expect(respEmpty.status).toBe(400);
    expect(((await respEmpty.json()) as { error: string }).error).toBe(
      "MISSING_FIELD",
    );

    // (c) Whitespace-only email — treated as missing.
    const respBlank = await h.call({
      email: "   ",
      turnstile_token: "ok",
    });
    expect(respBlank.status).toBe(400);
    expect(((await respBlank.json()) as { error: string }).error).toBe(
      "MISSING_FIELD",
    );

    // No leads written and no Resend calls.
    expect(await readAllLeads(h.test)).toHaveLength(0);
    expect(h.fetchMock.findCall((u) => u.includes("resend.test"))).toBeUndefined();
  });
});
