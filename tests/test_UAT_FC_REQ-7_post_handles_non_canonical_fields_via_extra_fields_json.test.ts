import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createHandlerHarness,
  readAllLeads,
  type HandlerHarness,
} from "./_helpers_REQ-7_handler.js";

describe("UAT FC REQ-7: non-canonical form fields are stored in extra_fields JSON", () => {
  let h: HandlerHarness;
  beforeEach(async () => {
    h = await createHandlerHarness();
  });
  afterEach(async () => {
    await h.cleanup();
  });

  it("captures fields outside the canonical columns under extra_fields", async () => {
    const resp = await h.call({
      email: "a@b.com",
      business: "Mary's Catering",
      vertical: "catering",
      turnstile_token: "ok",
    });
    expect(resp.status).toBe(200);

    const rows = await readAllLeads(h.test);
    expect(rows).toHaveLength(1);
    const extra = JSON.parse(rows[0]!.extra_fields as string);
    expect(extra).toEqual({
      business: "Mary's Catering",
      vertical: "catering",
    });
  });
});
