import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createHandlerHarness,
  readAllLeads,
  type HandlerHarness,
} from "./_helpers_REQ-7_handler.js";

describe("UAT AC-472: Persisted lead's ip_country is populated from the CF-IPCountry request header", () => {
  let h: HandlerHarness;
  beforeEach(async () => {
    h = await createHandlerHarness();
  });
  afterEach(async () => {
    await h.cleanup();
  });

  it("test_UAT_AC472_ip_country_populated_from_cf_header", async () => {
    // (a) With CF-IPCountry header.
    const respWith = await h.call(
      { email: "a@b.com", turnstile_token: "ok" },
      { headers: { "cf-ipcountry": "GB" } },
    );
    expect(respWith.status).toBe(200);
    let rows = await readAllLeads(h.test);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.ip_country).toBe("GB");

    // (b) Without the header — column persisted as null.
    const respWithout = await h.call({
      email: "b@c.com",
      turnstile_token: "ok",
    });
    expect(respWithout.status).toBe(200);
    rows = await readAllLeads(h.test);
    expect(rows).toHaveLength(2);
    const newRow = rows.find((r) => r.email === "b@c.com")!;
    expect(newRow.ip_country).toBeNull();
  });
});
