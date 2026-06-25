import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { Footer, Header, Hero } from "@1stcontact/framework";

const HERE = dirname(fileURLToPath(import.meta.url));

async function readScopedCss(id: string): Promise<string> {
  const source = await readFile(
    resolve(HERE, `../packages/framework/src/modules/${id}/index.astro`),
    "utf-8",
  );
  const match = /<style>([\s\S]*?)<\/style>/.exec(source);
  if (!match) throw new Error(`No <style> block in ${id}/index.astro`);
  return match[1] ?? "";
}

describe("UAT AC-423: every chrome module's scoped styling references theme custom properties exclusively", () => {
  it("test_UAT_AC423_chrome_module_scoped_css_uses_theme_custom_properties", async () => {
    const headerCss = await readScopedCss("header");
    const heroCss = await readScopedCss("hero");
    const footerCss = await readScopedCss("footer");
    const cases = [
      { id: "header", css: headerCss },
      { id: "hero", css: heroCss },
      { id: "footer", css: footerCss },
    ];

    for (const { id, css } of cases) {
      // At least one var(--color-*) reference
      expect(css, `${id} CSS should reference --color-* tokens`).toMatch(
        /var\(--color-[\w-]+\)/,
      );
      // At least one var(--space-*) reference
      expect(css, `${id} CSS should reference --space-* tokens`).toMatch(
        /var\(--space-[\w-]+\)/,
      );

      // No hex color literals (#fff, #ffffff, #ffffffff)
      expect(css, `${id} CSS should contain no hex color literals`).not.toMatch(
        /#[0-9a-fA-F]{3,8}\b/,
      );

      // Every font-family declaration must use a var(--font-family-*) value.
      const fontFamilyDecls = css.match(/font-family\s*:[^;}]+/gi) ?? [];
      for (const decl of fontFamilyDecls) {
        expect(
          decl,
          `${id} font-family declaration should resolve from a theme token: ${decl}`,
        ).toMatch(/var\(--font-family-/);
      }
    }

    // Rendered markup: the root element of each chrome module must NOT
    // carry an inline style attribute (which would override theme tokens).
    const container = await AstroContainer.create();

    const headerHtml = await container.renderToString(Header, {
      props: {
        logo: "Acme",
        entries: [{ label: "Home", target: { kind: "page", pageId: "home" } }],
      },
    });
    assertNoInlineStyleOnRoot(headerHtml, "header");

    const heroHtml = await container.renderToString(Hero, {
      props: { variant: "bg-color", heading: "Welcome" },
    });
    assertNoInlineStyleOnRoot(heroHtml, "hero");

    const footerHtml = await container.renderToString(Footer, {
      props: { copyrightHolder: "Acme", copyrightYear: "2026" },
    });
    assertNoInlineStyleOnRoot(footerHtml, "footer");
  });
});

function assertNoInlineStyleOnRoot(html: string, moduleId: string): void {
  // The root element of each module is the first element bearing
  // data-module="<id>". Confirm it carries no inline style attribute.
  const rootMatch = new RegExp(
    `<[a-z]+\\b[^>]*\\sdata-module="${moduleId}"[^>]*>`,
  ).exec(html);
  expect(rootMatch, `root element with data-module="${moduleId}"`).not.toBeNull();
  expect(
    rootMatch![0],
    `root element of ${moduleId} must not carry an inline style attribute`,
  ).not.toMatch(/\sstyle\s*=/);
}
