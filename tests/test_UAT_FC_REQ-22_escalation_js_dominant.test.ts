import { describe, expect, it } from "vitest";
import { shouldEscalateToRendered } from "../packages/extractor/src/index.js";

describe("UAT FC REQ-22: shouldEscalateToRendered js_dominant (AC 2)", () => {
  it("AC2: a body where >80% of bytes are inside <script> escalates with reason='js_dominant'", () => {
    // Substantial visible text to clear the thin_body threshold, then a much
    // larger inline script that dominates the body bytes.
    const visibleText = "The page renders this paragraph statically with enough chars to clear the 200-char body threshold so we know the js_dominant branch (and not thin_body) is what fires the escalation here. We deliberately repeat content to push past the cutoff.";
    const padding = "a".repeat(8000);
    const html = `<!doctype html><html><body><main><h1>Heading</h1><p>${visibleText}</p></main><script>${padding}</script></body></html>`;
    const decision = shouldEscalateToRendered({ html });
    expect(decision.escalate).toBe(true);
    expect(decision.reason).toBe("js_dominant");
  });
});
