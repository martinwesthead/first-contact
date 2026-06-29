import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * AC-768: The convert-flow LLM context (the authoring assistant's module-
 * selection guidance) includes a `logo-strip` entry describing it as a
 * horizontal row of small same-size logos/icons with optional labels and
 * links, naming both the `logos` and `features` variants and the `columns`
 * dial, and guiding the assistant to choose it for rows of small logos/icons
 * (not for individual hero or service images).
 */
describe("UAT AC-768: convert-flow LLM context documents logo-strip module selection", () => {
  it("test_UAT_AC768_convert_flow_context_documents_logo_strip_selection", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const docPath = resolve(
      here,
      "../docs/llm-context/reproducing-a-website.md",
    );
    const doc = readFileSync(docPath, "utf-8");

    // Isolate the logo-strip selection entry so the assertions below are about
    // that bullet, not an incidental mention elsewhere.
    const entry = doc
      .split("\n")
      .find((line) => line.includes("`logo-strip`"));
    expect(entry, "expected a logo-strip selection bullet").toBeDefined();
    const bullet = entry as string;

    // Describes it as a horizontal row of small logos/icons.
    expect(bullet).toMatch(/horizontal row of small/i);

    // Names both variants and the columns dial.
    expect(bullet).toContain("`logos`");
    expect(bullet).toContain("`features`");
    expect(bullet).toContain("`columns`");

    // Guides selection: a row of small same-size logos/icons, not hero/service
    // images.
    expect(bullet).toMatch(/row of small same-size logos or icons/i);
    expect(bullet).toMatch(/not for individual hero or service images/i);
  });
});
