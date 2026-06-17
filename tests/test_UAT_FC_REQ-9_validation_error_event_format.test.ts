import { describe, expect, it } from "vitest";
import worker from "../apps/control-app/src/index.js";
import { waitForSseFrame } from "./_helpers_REQ-9_sse.js";

describe("UAT FC REQ-9: client-side validator rejection surfaces as validation:error on SSE", () => {
  it("POST /api/operator/report_validation_rejection emits validation:error with {tool, path, expected, got}", async () => {
    const sessionId = "sse-validation-err-1";

    const sseRequest = new Request(
      `https://app.1stcontact.io/api/operator/events?session_id=${sessionId}`,
      { method: "GET" },
    );
    const sseResponse = await worker.fetch(sseRequest, {});
    expect(sseResponse.status).toBe(200);

    const framePromise = waitForSseFrame(sseResponse, "validation:error", 1000);

    // FE has just had applyToolCall return a structured rejection for an
    // out-of-enum dial value. It reports it to the server so the channel
    // multiplexes it for any listeners (and so the next AI turn can see it).
    const reportRequest = new Request(
      "https://app.1stcontact.io/api/operator/report_validation_rejection",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-session-id": sessionId,
          "x-plan-tier": "trial",
        },
        body: JSON.stringify({
          tool: "set_module_dial",
          path: "modules[?id=hero-1].dials.size",
          expected: ["sm", "md", "lg"],
          got: "huge",
          message: "dial 'size' value 'huge' is not in [sm, md, lg]",
        }),
      },
    );
    const reportResponse = await worker.fetch(reportRequest, {});
    expect(reportResponse.status).toBe(200);

    const frame = await framePromise;
    expect(frame.event).toBe("validation:error");
    expect(frame.data.tool).toBe("set_module_dial");
    expect(frame.data.path).toBe("modules[?id=hero-1].dials.size");
    expect(frame.data.expected).toEqual(["sm", "md", "lg"]);
    expect(frame.data.got).toBe("huge");
  });
});
