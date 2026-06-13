import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createHandlerHarness,
  readAllLeads,
  type HandlerHarness,
} from "./_helpers_REQ-7_handler.js";

describe("UAT FC REQ-7: POST /api/forms/contact inserts a lead row with all canonical fields", () => {
  let h: HandlerHarness;
  beforeEach(async () => {
    h = await createHandlerHarness();
  });
  afterEach(async () => {
    await h.cleanup();
  });

  it("persists the submission to the leads table with the right values", async () => {
    const resp = await h.call({
      name: "Ada Lovelace",
      email: "ada@example.com",
      phone: "+44 20 1234 5678",
      message: "Hi — interested in early access.",
      turnstile_token: "ok",
    });

    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { success: boolean; lead_id: string };
    expect(body.success).toBe(true);
    expect(body.lead_id).toMatch(/.+/);

    const rows = await readAllLeads(h.test);
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row).toMatchObject({
      site_id: "1stcontact",
      form_id: "contact",
      name: "Ada Lovelace",
      email: "ada@example.com",
      phone: "+44 20 1234 5678",
      message: "Hi — interested in early access.",
      status: "new",
      turnstile_pass: 1,
    });
    expect(row.id).toBe(body.lead_id);
    expect(typeof row.created_at).toBe("number");
  });
});
