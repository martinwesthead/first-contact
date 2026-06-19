import { describe, expect, it } from "vitest";
import { NOT_DETECTED } from "../packages/extractor/src/index.js";
import { loadFixture, makeHarness } from "./_helpers_REQ-21_analyze_page.js";

describe("UAT FC REQ-21: sparse signals serialize as not_detected (AC 2)", () => {
  it("AC2: a page with no <link rel=stylesheet> and no inline style attributes serializes palette and typography fields as not_detected; whatsMissing lists both", async () => {
    const h = makeHarness();
    h.setHtmlBody(loadFixture("sparse-signal"));
    // No anthropic commentary → falls back to deterministic baseline.
    h.setAnthropicCommentary(null);

    const result = await h.invoke({ url: "https://x.test/" });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    const payload = result.payload as {
      digest: {
        signals: {
          palette: { background: string; body: string; accent: string; cta: string };
          typography: { body: { family: string }; primaryPair: unknown };
        };
        commentary: { whatsMissing: string[] };
      };
    };

    expect(payload.digest.signals.palette.background).toBe(NOT_DETECTED);
    expect(payload.digest.signals.palette.body).toBe(NOT_DETECTED);
    expect(payload.digest.signals.palette.accent).toBe(NOT_DETECTED);
    expect(payload.digest.signals.palette.cta).toBe(NOT_DETECTED);
    expect(payload.digest.signals.typography.body.family).toBe(NOT_DETECTED);
    expect(payload.digest.signals.typography.primaryPair).toBe(NOT_DETECTED);

    const missing = payload.digest.commentary.whatsMissing.join("\n");
    expect(missing).toMatch(/Palette/);
    expect(missing).toMatch(/Typography/);
  });
});
