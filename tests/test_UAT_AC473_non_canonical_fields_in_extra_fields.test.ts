import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createHandlerHarness,
  readAllLeads,
  type HandlerHarness,
} from "./_helpers_REQ-7_handler.js";

describe("UAT AC-473: Non-canonical submission fields are preserved in the lead's extra_fields JSON column", () => {
  let h: HandlerHarness;
  beforeEach(async () => {
    h = await createHandlerHarness();
  });
  afterEach(async () => {
    await h.cleanup();
  });

  it("test_UAT_AC473_extra_fields_captures_non_canonical_fields_or_null", async () => {
    // (a) With extras → JSON-encoded object with exactly those properties.
    const respWith = await h.call({
      email: "a@b.com",
      business_name: "Acme Co",
      service_interest: "consulting",
      turnstile_token: "ok",
    });
    expect(respWith.status).toBe(200);
    let rows = await readAllLeads(h.test);
    expect(rows).toHaveLength(1);
    expect(typeof rows[0]!.extra_fields).toBe("string");
    const parsed = JSON.parse(rows[0]!.extra_fields as string);
    expect(parsed).toEqual({
      business_name: "Acme Co",
      service_interest: "consulting",
    });

    // (b) Only canonical fields → extra_fields stored as null.
    const respCanonicalOnly = await h.call({
      name: "Ada",
      email: "ada@example.com",
      phone: "555-1234",
      message: "hi",
      page_path: "/contact",
      turnstile_token: "ok",
    });
    expect(respCanonicalOnly.status).toBe(200);
    rows = await readAllLeads(h.test);
    expect(rows).toHaveLength(2);
    const canonicalRow = rows.find((r) => r.email === "ada@example.com")!;
    expect(canonicalRow.extra_fields).toBeNull();
  });
});
