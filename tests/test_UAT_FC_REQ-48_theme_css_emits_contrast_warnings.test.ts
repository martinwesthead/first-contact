import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateThemeCss } from "@1stcontact/framework";

describe("UAT FC REQ-48: generateThemeCss surfaces contrast failures as warnings", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("emits no fc-contrast-warning comment for a palette where every pair passes", () => {
    const css = generateThemeCss({
      palette: {
        bg: "#ffffff",
        surface: "#ffffff",
        surfaceSubtle: "#fafafa",
        surfaceInverse: "#0f172a",
        text: "#0f172a",
        muted: "#475569",
        primary: "#1d4ed8",
        accent: "#0f172a",
        border: "#e2e8f0",
      },
    });
    expect(css).not.toMatch(/fc-contrast-warning/);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("still emits the :root token block alongside any warnings", () => {
    const css = generateThemeCss({
      palette: { surfaceSubtle: "#fafafa", text: "#eeeeee" },
    });
    expect(css).toMatch(/:root\s*\{/);
    expect(css).toMatch(/--color-bg:/);
  });

  it("emits a /* fc-contrast-warning: subtle ... */ comment when subtle surface fails", () => {
    const css = generateThemeCss({
      palette: { surfaceSubtle: "#fafafa", text: "#eeeeee" },
    });
    expect(css).toMatch(/\/\* fc-contrast-warning: subtle[^*]*\*\//);
  });

  it("names every failing surface (does not stop at the first one)", () => {
    const css = generateThemeCss({
      palette: {
        bg: "#ffffff",
        surfaceSubtle: "#fafafa",
        text: "#eeeeee",
        accent: "#fbbf24",
      },
    });
    expect(css).toMatch(/fc-contrast-warning: subtle/);
    expect(css).toMatch(/fc-contrast-warning: accent/);
  });

  it("logs a single console.warn naming the failing surfaces", () => {
    generateThemeCss({
      palette: { surfaceSubtle: "#fafafa", text: "#eeeeee" },
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const message = String(warnSpy.mock.calls[0]?.[0]);
    expect(message.toLowerCase()).toContain("contrast");
    expect(message).toContain("subtle");
  });
});
