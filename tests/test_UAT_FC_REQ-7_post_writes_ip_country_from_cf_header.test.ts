import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createHandlerHarness,
  readAllLeads,
  type HandlerHarness,
} from "./_helpers_REQ-7_handler.js";

describe("UAT FC REQ-7: ip_country is populated from the CF-IPCountry header", () => {
  let h: HandlerHarness;
  beforeEach(async () => {
    h = await createHandlerHarness();
  });
  afterEach(async () => {
    await h.cleanup();
  });

  it("reads CF-IPCountry from the request and stores it on the lead row", async () => {
    const resp = await h.call(
      { email: "a@b.com", turnstile_token: "ok" },
      { headers: { "cf-ipcountry": "GB" } },
    );
    expect(resp.status).toBe(200);
    const rows = await readAllLeads(h.test);
    expect(rows[0]!.ip_country).toBe("GB");
  });
});
