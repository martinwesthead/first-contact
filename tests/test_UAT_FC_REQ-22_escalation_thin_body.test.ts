import { describe, expect, it } from "vitest";
import { shouldEscalateToRendered } from "../packages/extractor/src/index.js";

describe("UAT FC REQ-22: shouldEscalateToRendered thin_body (AC 1)", () => {
  it("AC1: a SPA shell with empty <body> escalates with reason='thin_body'", () => {
    const html = `<!doctype html><html><body><div id="root"></div></body></html>`;
    const decision = shouldEscalateToRendered({ html });
    expect(decision.escalate).toBe(true);
    expect(decision.reason).toBe("thin_body");
  });

  it("AC1: a body with >200 chars of visible text and no script dominance does NOT escalate", () => {
    const longText = "This is real content that is well above the 200-character threshold so the static-fetch path can derive enough signal without paying for the rendered escalation. It includes headings, paragraphs, links, and lists.";
    const html = `<!doctype html><html><body><main><h1>Heading</h1><p>${longText}</p></main></body></html>`;
    const decision = shouldEscalateToRendered({ html });
    expect(decision.escalate).toBe(false);
    expect(decision.reason).toBe("sufficient");
  });
});
