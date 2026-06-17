import { describe, expect, it } from "vitest";
import worker from "../apps/control-app/src/index.js";

describe("UAT FC REQ-9: trial plan_tier cannot invoke publish_stub", () => {
  it("returns 403 when an action gated to plan_tier='paid' is invoked from a trial session", async () => {
    const request = new Request("https://app.1stcontact.io/api/operator/publish_stub", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-session-id": "trial-test-1",
        "x-plan-tier": "trial",
      },
      body: JSON.stringify({}),
    });
    const response = await worker.fetch(request, {});
    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("publish_stub");
    expect(body.error).toContain("paid");
  });

  it("returns 403 when no x-plan-tier header is sent (defaults to trial)", async () => {
    const request = new Request("https://app.1stcontact.io/api/operator/publish_stub", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-session-id": "anon-test-1",
      },
      body: JSON.stringify({}),
    });
    const response = await worker.fetch(request, {});
    expect(response.status).toBe(403);
  });

  it("permits the action when plan_tier='paid' is presented", async () => {
    const request = new Request("https://app.1stcontact.io/api/operator/publish_stub", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-session-id": "paid-test-1",
        "x-plan-tier": "paid",
        "x-account-id": "acct-1",
      },
      body: JSON.stringify({ note: "first publish" }),
    });
    const response = await worker.fetch(request, {});
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      status: string;
      action: string;
      payload: Record<string, unknown>;
    };
    expect(body.status).toBe("ok");
    expect(body.action).toBe("publish_stub");
    expect(body.payload.status).toBe("published");
    expect(body.payload.note).toBe("first publish");
  });
});
