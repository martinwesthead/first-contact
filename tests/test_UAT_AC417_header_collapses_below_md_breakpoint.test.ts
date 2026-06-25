import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { Header } from "@1stcontact/framework";

const HERE = dirname(fileURLToPath(import.meta.url));

async function readHeaderScopedCss(): Promise<string> {
  const source = await readFile(
    resolve(HERE, "../packages/framework/src/modules/header/index.astro"),
    "utf-8",
  );
  const match = /<style>([\s\S]*?)<\/style>/.exec(source);
  expect(match).not.toBeNull();
  return match![1] ?? "";
}

describe("UAT AC-417: header collapses to a hamburger control below the md breakpoint", () => {
  it("test_UAT_AC417_header_collapses_below_md_breakpoint", async () => {
    // Rendered markup contract: button toggle, aria-controls, and the
    // navigation region it controls are both present.
    const container = await AstroContainer.create();
    const html = await container.renderToString(Header, {
      props: {
        logo: "Acme",
        entries: [{ label: "Home", target: { kind: "page", pageId: "home" } }],
      },
    });

    const toggleMatch = /<button\b[^>]*aria-controls="([^"]+)"[^>]*>/.exec(html);
    expect(toggleMatch, "toggle button with aria-controls present").not.toBeNull();
    const navId = toggleMatch![1];
    expect(navId).toBeTruthy();

    // The nav region with that id is in the DOM.
    const navIdEscaped = navId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    expect(html).toMatch(new RegExp(`<nav\\b[^>]*id="${navIdEscaped}"`));

    // The toggle must carry an accessible name (visible label or sr-only span).
    const buttonBlockMatch = /<button\b[\s\S]*?<\/button>/.exec(html);
    expect(buttonBlockMatch, "toggle button block").not.toBeNull();
    const buttonBlock = buttonBlockMatch![0];
    expect(buttonBlock.length).toBeGreaterThan(0);
    // Accessible name is provided either by aria-label, aria-labelledby, or
    // visible text inside the button (including sr-only span). The shipped
    // implementation uses an .fc-sr-only span containing "Menu".
    const hasAriaName = /aria-(label|labelledby)\s*=/.test(buttonBlock);
    const hasVisibleText = />[^<]*\w[^<]*</.test(
      buttonBlock.replace(/^<button\b[^>]*>/, ""),
    );
    expect(hasAriaName || hasVisibleText).toBe(true);

    // Scoped CSS contract: below md, toggle shown / nav hidden;
    // at and above md, nav shown / toggle hidden.
    const css = await readHeaderScopedCss();

    // Outside-the-media-query base rules: nav hidden, toggle visible.
    // We can locate the "before" state by looking at rules outside the @media.
    const mediaStart = css.indexOf("@media");
    expect(mediaStart).toBeGreaterThan(-1);
    const base = css.slice(0, mediaStart);
    const inMedia = css.slice(mediaStart);

    // Base state — nav hidden (display: none)
    expect(base).toMatch(/\.fc-header__nav\s*\{[^}]*display:\s*none/);

    // @media query targets md breakpoint (768px is the framework's md).
    expect(inMedia).toMatch(/@media\s*\([^)]*min-width:\s*768px[^)]*\)/);
    // Inverts: nav visible, toggle hidden.
    expect(inMedia).toMatch(/\.fc-header__nav\s*\{[^}]*display:\s*block/);
    expect(inMedia).toMatch(/\.fc-header__toggle\s*\{[^}]*display:\s*none/);
  });
});
