import { describe, expect, it } from "vitest";
import { AssetRefImage, AssetRefText, AssetRef, MarkdownContent } from "@1stcontact/site-schema";

describe("UAT FC REQ-33 AC1: schema accepts AssetRef { kind: 'text' }", () => {
  it("validates an AssetRef-text with src, id, and optional alt", () => {
    const parsed = AssetRefText.safeParse({
      kind: "text",
      src: "sites/x/copy/hero.md",
      id: "sites/x/copy/hero.md",
      alt: "fallback line",
    });
    expect(parsed.success).toBe(true);
  });

  it("validates an AssetRef-text with alt omitted", () => {
    const parsed = AssetRefText.safeParse({
      kind: "text",
      src: "sites/x/copy/hero.md",
      id: "sites/x/copy/hero.md",
    });
    expect(parsed.success).toBe(true);
  });

  it("validates an AssetRef-text via the AssetRef union", () => {
    const parsed = AssetRef.safeParse({
      kind: "text",
      src: "sites/x/copy/hero.md",
      id: "sites/x/copy/hero.md",
    });
    expect(parsed.success).toBe(true);
  });

  it("AC4: rejects an AssetRef-text whose src is empty", () => {
    const parsed = AssetRefText.safeParse({
      kind: "text",
      src: "",
      id: "sites/x/copy/hero.md",
    });
    expect(parsed.success).toBe(false);
  });

  it("preserves back-compat — image-shaped AssetRef without kind validates", () => {
    const parsed = AssetRefImage.safeParse({
      id: "img-1",
      src: "/assets/hero.png",
      alt: "hero",
    });
    expect(parsed.success).toBe(true);
  });

  it("MarkdownContent union accepts both inline string and AssetRef-text", () => {
    expect(MarkdownContent.safeParse("# Hello").success).toBe(true);
    expect(
      MarkdownContent.safeParse({
        kind: "text",
        src: "sites/x/copy/hero.md",
        id: "sites/x/copy/hero.md",
      }).success,
    ).toBe(true);
  });
});
