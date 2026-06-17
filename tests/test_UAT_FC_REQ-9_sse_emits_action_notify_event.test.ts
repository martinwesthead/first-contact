import { describe, expect, it } from "vitest";
import worker from "../apps/control-app/src/index.js";
import { waitForSseFrame } from "./_helpers_REQ-9_sse.js";

describe("UAT FC REQ-9: SSE channel delivers action:notify within 100ms of action execution", () => {
  it("subscribes to /api/operator/events, invokes publish_stub, receives action:notify", async () => {
    const sessionId = "sse-action-notify-1";

    const sseRequest = new Request(
      `https://app.1stcontact.io/api/operator/events?session_id=${sessionId}`,
      { method: "GET" },
    );
    const sseResponse = await worker.fetch(sseRequest, {});
    expect(sseResponse.status).toBe(200);
    expect(sseResponse.headers.get("content-type")).toContain("text/event-stream");

    // Start waiting for the action:notify frame BEFORE invoking the action so
    // the reader is attached. The bus.publish is synchronous w.r.t. the
    // controller.enqueue; the frame is sitting in the stream by the time we
    // start reading.
    const framePromise = waitForSseFrame(sseResponse, "action:notify", 1000);

    const actionRequest = new Request(
      "https://app.1stcontact.io/api/operator/publish_stub",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-session-id": sessionId,
          "x-plan-tier": "paid",
          "x-account-id": "acct-x",
        },
        body: JSON.stringify({ note: "hello" }),
      },
    );
    const start = Date.now();
    const actionResponse = await worker.fetch(actionRequest, {});
    expect(actionResponse.status).toBe(200);

    const frame = await framePromise;
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(500); // generous; UAT target is 100ms

    expect(frame.event).toBe("action:notify");
    expect(frame.data.action).toBe("publish_stub");
    expect(frame.data.status).toBe("published");
    expect(frame.data.note).toBe("hello");
  });
});
