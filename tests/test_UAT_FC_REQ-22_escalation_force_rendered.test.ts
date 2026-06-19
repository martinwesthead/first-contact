import { describe, expect, it } from "vitest";
import { shouldEscalateToRendered } from "../packages/extractor/src/index.js";

describe("UAT FC REQ-22: shouldEscalateToRendered forceRendered (AC 3)", () => {
  it("AC3: forceRendered=true always escalates with reason='operator_request', regardless of heuristic", () => {
    const richText = "A".repeat(400);
    const html = `<!doctype html><html><body><h1>Title</h1><p>${richText}</p></body></html>`;
    // Without the flag, this rich-text page would NOT escalate.
    expect(shouldEscalateToRendered({ html }).escalate).toBe(false);
    // With forceRendered=true, escalation fires.
    const decision = shouldEscalateToRendered({ html, forceRendered: true });
    expect(decision.escalate).toBe(true);
    expect(decision.reason).toBe("operator_request");
  });
});
