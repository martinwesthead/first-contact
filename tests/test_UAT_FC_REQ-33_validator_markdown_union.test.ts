import { describe, expect, it } from "vitest";
import { textBlockMeta, validateModuleContent } from "@gendev/framework";

describe("UAT FC REQ-33 AC2/AC3: validator accepts string OR AssetRef-text for markdown content fields", () => {
  it("AC2: markdown field set to an inline string validates", () => {
    const result = validateModuleContent(textBlockMeta, {
      heading: "About",
      body: "<p>Some content.</p>",
    });
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("AC3: markdown field set to an AssetRef-text validates", () => {
    const result = validateModuleContent(textBlockMeta, {
      heading: "About",
      body: {
        kind: "text",
        id: "sites/acct-1/copy/about.md",
        src: "sites/acct-1/copy/about.md",
        alt: "first line fallback",
      },
    });
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("rejects an object that isn't an AssetRef-text shape", () => {
    const result = validateModuleContent(textBlockMeta, {
      heading: "About",
      body: { kind: "image", id: "x", src: "x", alt: "x" },
    });
    expect(result.ok).toBe(false);
    expect(result.issues[0].path).toEqual(["body"]);
  });

  it("rejects an AssetRef-text shape with empty src", () => {
    const result = validateModuleContent(textBlockMeta, {
      heading: "About",
      body: { kind: "text", id: "x", src: "" },
    });
    expect(result.ok).toBe(false);
  });
});
