import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createHandlerHarness,
  readAllLeads,
  type HandlerHarness,
} from "./_helpers_REQ-7_handler.js";

describe("UAT AC-465: POST /api/forms/contact with a valid submission persists a lead and returns 200 with a lead_id", () => {
  let h: HandlerHarness;
  beforeEach(async () => {
    h = await createHandlerHarness();
  });
  afterEach(async () => {
    await h.cleanup();
  });

  it("test_UAT_AC465_valid_submission_inserts_lead_and_returns_lead_id", async () => {
    const resp = await h.call(
      {
        name: "Ada Lovelace",
        email: "ada@example.com",
        phone: "+44 20 1234 5678",
        message: "Hi — interested in early access.",
        page_path: "/",
        turnstile_token: "ok",
      },
      { deps: { generateId: () => "lead-fixed-id-AC465" } },
    );

    // Response shape: 200, success:true, non-empty lead_id, message present.
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as {
      success: boolean;
      lead_id: string;
      message: string;
    };
    expect(body.success).toBe(true);
    expect(body.lead_id).toBe("lead-fixed-id-AC465");
    expect(body.message).toMatch(/Thanks/);

    // Exactly one row inserted with the expected canonical columns.
    const rows = await readAllLeads(h.test);
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.id).toBe(body.lead_id);
    expect(row.site_id).toBe("1stcontact");
    expect(row.form_id).toBe("contact");
    expect(row.name).toBe("Ada Lovelace");
    expect(row.email).toBe("ada@example.com");
    expect(row.phone).toBe("+44 20 1234 5678");
    expect(row.message).toBe("Hi — interested in early access.");
    expect(row.page_path).toBe("/");
    expect(row.status).toBe("new");
    expect(typeof row.created_at).toBe("number");
    expect(row.created_at).toBeGreaterThan(0);
  });
});
