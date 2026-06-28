import { describe, expect, it } from "vitest";
import { shouldEscalateToRendered } from "../packages/extractor/src/index.js";

/**
 * AC-610: A document whose <script> content exceeds 80% of the <body> byte
 * size escalates with reason 'js_dominant' — even when the visible body text on
 * its own would clear the thin-body threshold. This catches JS-rendered apps
 * whose static HTML is mostly bundled script.
 */
describe("UAT AC-610: a JS-dominant document escalates to the rendered path", () => {
  it("test_UAT_AC610_js_dominant_document_escalates", () => {
    // Enough visible text to clear the 200-char thin-body threshold, so the
    // decision can only be driven by the script-dominance branch.
    const visibleText =
      "The page renders this paragraph statically with more than enough characters " +
      "to clear the 200-character thin-body threshold, ensuring it is the js_dominant " +
      "branch (and not thin_body) that fires the escalation for this fixture.";
    // A large inline script that pushes <script> bytes past 80% of body bytes.
    const scriptPadding = "a".repeat(8000);
    const html = `<!doctype html><html><body><main><h1>Heading</h1><p>${visibleText}</p></main><script>${scriptPadding}</script></body></html>`;

    const decision = shouldEscalateToRendered({ html });
    expect(decision.escalate).toBe(true);
    expect(decision.reason).toBe("js_dominant");
  });
});
