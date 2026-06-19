import { describe, expect, it } from "vitest";
import { loadFixture, makeHarness } from "./_helpers_REQ-21_analyze_page.js";

describe("UAT FC REQ-21: safety failures propagate as typed errors on ok:false (AC 12)", () => {
  it("AC12: missing operator intent → failed with a clear message", async () => {
    const h = makeHarness({ operatorLastMessage: null });
    h.setHtmlBody(loadFixture("plain-html-site"));
    const result = await h.invoke({ url: "https://x.test/" });
    expect(result.status).toBe("failed");
    if (result.status !== "failed") return;
    expect(result.error).toMatch(/operator intent/i);
  });

  it("AC12: robots.txt disallow → failed with a robots message; no HTML fetch", async () => {
    const h = makeHarness();
    h.setRobotsBlocked(true);
    h.setHtmlBody(loadFixture("plain-html-site"));
    const result = await h.invoke({ url: "https://x.test/" });
    expect(result.status).toBe("failed");
    if (result.status !== "failed") return;
    expect(result.error).toMatch(/robots\.txt/i);
    // robots.txt was fetched but the page itself was not.
    const htmlFetched = h.fetchCalls.some(
      (c) => c.url === "https://x.test/" || c.url.endsWith("/index.html"),
    );
    expect(htmlFetched).toBe(false);
  });

  it("AC12: invalid URL input → failed with a URL validation message; no fetch attempt", async () => {
    const h = makeHarness();
    const result = await h.invoke({ url: "not-a-url" });
    expect(result.status).toBe("failed");
    if (result.status !== "failed") return;
    expect(result.error).toMatch(/'url'/);
    expect(h.fetchCalls.length).toBe(0);
  });
});
