import { describe, expect, it } from "vitest";
import { loadFixture, makeHarness } from "./_helpers_REQ-21_analyze_page.js";

describe("UAT FC REQ-21: KV digest cache returns cached digest on second call (AC 10)", () => {
  it("AC10: a second analyze_page call within 24h reads the digest from KV — no safeFetch, no LLM commentary call", async () => {
    const h = makeHarness();
    h.setHtmlBody(loadFixture("plain-html-site"));
    h.setAnthropicCommentary({
      summary: "First-call commentary.",
      perSection: {},
      whatsMissing: [],
    });

    const first = await h.invoke({ url: "https://x.test/" });
    expect(first.status).toBe("ok");
    if (first.status !== "ok") return;
    expect((first.payload as { cache: string }).cache).toBe("MISS");
    const firstAnthropic = h.anthropicCalls;
    const firstFetches = h.fetchCalls.length;

    const second = await h.invoke({ url: "https://x.test/" });
    expect(second.status).toBe("ok");
    if (second.status !== "ok") return;
    expect((second.payload as { cache: string }).cache).toBe("HIT");
    // Second call MUST NOT invoke Anthropic and MUST NOT fetch the URL.
    expect(h.anthropicCalls).toBe(firstAnthropic);
    expect(h.fetchCalls.length).toBe(firstFetches);
  });
});
