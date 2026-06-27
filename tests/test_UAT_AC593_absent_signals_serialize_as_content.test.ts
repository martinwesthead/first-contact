import { describe, expect, it } from "vitest";
import { extractSignals, NOT_DETECTED } from "../packages/extractor/src/index.js";

/** Recursively assert no value in the structure is null or undefined. */
function assertNoNullOrUndefined(value: unknown, path: string): void {
  expect(value, `null/undefined at ${path}`).not.toBeNull();
  expect(value, `null/undefined at ${path}`).not.toBeUndefined();
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertNoNullOrUndefined(v, `${path}[${i}]`));
  } else if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      assertNoNullOrUndefined(v, `${path}.${k}`);
    }
  }
}

describe("UAT AC-593: absent signals serialize as content, never as omission", () => {
  it("test_UAT_AC593_absent_signals_serialize_as_content", () => {
    const minimalHtml = `<!doctype html><html><head></head><body></body></html>`;
    const signals = extractSignals(minimalHtml, "https://x.test/");

    // Every signal section is present.
    expect(signals.palette).toBeDefined();
    expect(signals.typography).toBeDefined();
    expect(signals.layout).toBeDefined();
    expect(signals.imagery).toBeDefined();
    expect(signals.content).toBeDefined();
    expect(signals.assetInventory).toBeDefined();

    // Scalar fields carry the literal not_detected sentinel rather than null.
    expect(signals.palette.background).toBe(NOT_DETECTED);
    expect(signals.palette.body).toBe(NOT_DETECTED);
    expect(signals.palette.accent).toBe(NOT_DETECTED);
    expect(signals.palette.cta).toBe(NOT_DETECTED);
    expect(signals.typography.body.family).toBe(NOT_DETECTED);
    expect(signals.typography.body.size).toBe(NOT_DETECTED);
    expect(signals.typography.body.weight).toBe(NOT_DETECTED);
    expect(signals.typography.primaryPair).toBe(NOT_DETECTED);
    expect(signals.layout.maxContentWidth).toBe(NOT_DETECTED);
    expect(signals.layout.bias).toBe(NOT_DETECTED);
    expect(signals.layout.density).toBe(NOT_DETECTED);

    // Array-typed fields are present as empty arrays.
    expect(signals.palette.supporting).toEqual([]);
    expect(signals.content.headings).toEqual([]);
    expect(signals.content.navLinks).toEqual([]);
    expect(signals.content.formFields).toEqual([]);
    expect(signals.assetInventory).toEqual([]);

    // No field anywhere in the signals is null or undefined.
    assertNoNullOrUndefined(signals, "signals");
  });
});
