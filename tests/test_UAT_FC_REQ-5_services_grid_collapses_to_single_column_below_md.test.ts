import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Below the md breakpoint (<768px) both grid variants collapse to one column.
// Astro's container renderer doesn't ship the scoped <style> block, so we
// assert directly against the source file: the base grid is 1fr, and the
// multi-column rules are gated by a min-width: 768px media query.
const modulePath = fileURLToPath(
  new URL(
    "../packages/framework/src/modules/services-grid/index.astro",
    import.meta.url,
  ),
);
const source = readFileSync(modulePath, "utf8");

function sliceMediaBlock(src: string, openerMatch: string): string {
  const start = src.indexOf(openerMatch);
  if (start < 0) return "";
  let depth = 0;
  let i = src.indexOf("{", start);
  if (i < 0) return "";
  for (; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return "";
}

describe("UAT FC REQ-5: services-grid collapses to single column below md", () => {
  it("base list rule lays out as a single column", () => {
    expect(source).toMatch(
      /\.fc-services-grid__list\s*\{[^}]*grid-template-columns:\s*1fr/,
    );
  });

  it("scopes multi-column layout inside a min-width: 768px media query", () => {
    expect(source).toMatch(/@media\s*\(\s*min-width:\s*768px\s*\)/);

    const block = sliceMediaBlock(source, "@media (min-width: 768px)");
    expect(block.length).toBeGreaterThan(0);
    expect(block).toMatch(/repeat\(\s*3\s*,\s*1fr\s*\)/);
    expect(block).toMatch(/repeat\(\s*2\s*,\s*1fr\s*\)/);
  });
});
