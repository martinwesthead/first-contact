import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { REPRODUCING_A_WEBSITE_DOC } from "../apps/control-app/src/llm-context.js";

const here = dirname(fileURLToPath(import.meta.url));
const howtoPath = resolve(here, "../docs/llm-context/reproducing-a-website.md");

describe("UAT FC REQ-41: convert-flow how-to names image-gallery", () => {
  it("the canonical .md mentions image-gallery and its items[] shape", () => {
    const src = readFileSync(howtoPath, "utf-8");
    expect(src).toMatch(/image-gallery/);
    expect(src).toMatch(/items\[\]/);
    expect(src).toMatch(/caption/);
  });

  it("the inlined mirror string also mentions image-gallery", () => {
    expect(REPRODUCING_A_WEBSITE_DOC).toMatch(/image-gallery/);
    expect(REPRODUCING_A_WEBSITE_DOC).toMatch(/items\[\]/);
  });
});
