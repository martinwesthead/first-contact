import { describe, expect, it } from "vitest";
import { shouldEscalateToRendered } from "../packages/extractor/src/index.js";

/**
 * AC-611: When the caller explicitly requests rendering (forceRendered), the
 * escalation decision reports escalate=true with reason 'operator_request'
 * unconditionally — regardless of body density or script ratio. A content-rich
 * page that would otherwise stay on the static path still escalates.
 */
describe("UAT AC-611: a force-rendered request escalates unconditionally", () => {
  it("test_UAT_AC611_force_rendered_escalates_unconditionally", () => {
    // A content-rich page that on heuristics alone would NOT escalate.
    const richText = "A".repeat(400);
    const html = `<!doctype html><html><body><h1>Title</h1><p>${richText}</p></body></html>`;

    // Sanity: without the flag this page stays on the static path.
    const baseline = shouldEscalateToRendered({ html });
    expect(baseline.escalate).toBe(false);

    // With forceRendered set, escalation fires for operator_request.
    const forced = shouldEscalateToRendered({ html, forceRendered: true });
    expect(forced.escalate).toBe(true);
    expect(forced.reason).toBe("operator_request");
  });
});
