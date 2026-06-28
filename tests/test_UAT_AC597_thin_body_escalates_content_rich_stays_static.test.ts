import { describe, expect, it } from "vitest";
import { shouldEscalateToRendered } from "../packages/extractor/src/index.js";

/**
 * AC-597: The escalation decision inspects the static fetch and reports whether
 * to escalate to the rendered path. A thin <body> (under 200 visible chars)
 * escalates with reason 'thin_body'; a content-rich body that meets the
 * threshold (and is neither JS-dominant nor force-rendered) stays on the static
 * path with escalate=false, reason 'sufficient'.
 */
describe("UAT AC-597: thin static body escalates; content-rich body stays static", () => {
  it("test_UAT_AC597_thin_body_escalates_content_rich_stays_static", () => {
    // (a) A SPA shell whose <body> renders fewer than 200 visible characters.
    const shellHtml = `<!doctype html><html><body><div id="root"></div></body></html>`;
    const thin = shouldEscalateToRendered({ html: shellHtml });
    expect(thin.escalate).toBe(true);
    expect(thin.reason).toBe("thin_body");

    // (b) A content-rich page: well over 200 visible chars and not JS-dominant.
    const richText =
      "This is real, server-rendered content that sits well above the 200-character " +
      "threshold, so the static-fetch path can derive enough design signal without " +
      "paying for a rendered escalation. It has a heading, a paragraph, and a list.";
    const richHtml = `<!doctype html><html><body><main><h1>About us</h1><p>${richText}</p><ul><li>One</li><li>Two</li></ul></main></body></html>`;
    const rich = shouldEscalateToRendered({ html: richHtml });
    expect(rich.escalate).toBe(false);
    expect(rich.reason).toBe("sufficient");
  });
});
