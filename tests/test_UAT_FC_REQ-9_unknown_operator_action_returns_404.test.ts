import { describe, expect, it } from "vitest";
import worker from "../apps/control-app/src/index.js";

describe("UAT FC REQ-9: POST /api/operator/<unknown> returns 404", () => {
  it("returns 404 with a clear error when the action is not in the registry", async () => {
    const request = new Request("https://app.1stcontact.io/api/operator/nonexistent", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-session-id": "test-session-404",
        "x-plan-tier": "paid",
      },
      body: JSON.stringify({}),
    });
    const response = await worker.fetch(request, {});
    expect(response.status).toBe(404);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("nonexistent");
  });

  it("returns 404 when the path has nested segments under /api/operator/", async () => {
    const request = new Request("https://app.1stcontact.io/api/operator/foo/bar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    const response = await worker.fetch(request, {});
    expect(response.status).toBe(404);
  });
});
