import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createHandlerHarness,
  readAllLeads,
  type HandlerHarness,
} from "./_helpers_REQ-7_handler.js";

describe("UAT AC-470: Submission with a malformed email is rejected with 400 INVALID_EMAIL and writes no lead", () => {
  let h: HandlerHarness;
  beforeEach(async () => {
    h = await createHandlerHarness();
  });
  afterEach(async () => {
    await h.cleanup();
  });

  it("test_UAT_AC470_malformed_email_rejected", async () => {
    // (a) No '@' at all.
    const respNoAt = await h.call({
      email: "not-an-email",
      turnstile_token: "ok",
    });
    expect(respNoAt.status).toBe(400);
    const bodyNoAt = (await respNoAt.json()) as {
      success: boolean;
      error: string;
      message: string;
    };
    expect(bodyNoAt.success).toBe(false);
    expect(bodyNoAt.error).toBe("INVALID_EMAIL");
    expect(bodyNoAt.message).toMatch(/.+/);

    // (b) No domain part.
    const respNoDomain = await h.call({
      email: "ada@",
      turnstile_token: "ok",
    });
    expect(respNoDomain.status).toBe(400);
    expect(((await respNoDomain.json()) as { error: string }).error).toBe(
      "INVALID_EMAIL",
    );

    // (c) Internal whitespace.
    const respWhitespace = await h.call({
      email: "ada lovelace@example.com",
      turnstile_token: "ok",
    });
    expect(respWhitespace.status).toBe(400);
    expect(((await respWhitespace.json()) as { error: string }).error).toBe(
      "INVALID_EMAIL",
    );

    // No leads, no Resend calls.
    expect(await readAllLeads(h.test)).toHaveLength(0);
    expect(h.fetchMock.findCall((u) => u.includes("resend.test"))).toBeUndefined();
  });
});
