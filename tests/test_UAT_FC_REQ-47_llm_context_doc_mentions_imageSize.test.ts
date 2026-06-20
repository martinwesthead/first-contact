import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { REPRODUCING_A_WEBSITE_DOC } from "../apps/control-app/src/llm-context.js";

const here = dirname(fileURLToPath(import.meta.url));
const howtoPath = resolve(here, "../docs/llm-context/reproducing-a-website.md");

describe("UAT FC REQ-47: convert-flow how-to documents imageSize dial", () => {
  it("the canonical .md tells the AI about the imageSize dial on image-gallery", () => {
    const src = readFileSync(howtoPath, "utf-8");
    // The image-gallery bullet mentions imageSize so the AI knows the dial
    // exists during convert.
    expect(src).toMatch(/image-gallery[\s\S]*imageSize/);
    // The values sm/md/lg are spelled out.
    expect(src).toMatch(/`sm`/);
    expect(src).toMatch(/`md`/);
    expect(src).toMatch(/`lg`/);
  });

  it("the inlined mirror string also mentions the imageSize dial", () => {
    expect(REPRODUCING_A_WEBSITE_DOC).toMatch(/imageSize/);
  });
});
