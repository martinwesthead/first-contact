import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  Banner,
  Hero,
  ServicesGrid,
  SplitSection,
  Testimonials,
  TextBlock,
} from "@gendev/framework";

// AC-772 (catalog-wide cross-cutting image-safety constraint): every catalog
// module that renders a markdown body constrains inline <img> elements within
// that body so an oversized image cannot break the layout — each such image is
// scoped to max-width: 100%; height: auto; display: block. This single
// behaviour spans modules owned by several stories (hero subhead, text-block
// body, services-grid subhead + per-item bodies, split-section body,
// testimonials quote, banner subhead) and is owned by story-1d5b450f.

const HERE = dirname(fileURLToPath(import.meta.url));

// Pull the authoritative scoped styling straight from each module's .astro
// <style> block — the same source AC-423 inspects. Comments stripped so a
// commented-out example cannot satisfy the scan.
async function readScopedCss(id: string): Promise<string> {
  const source = await readFile(
    resolve(HERE, `../packages/framework/src/modules/${id}/index.astro`),
    "utf-8",
  );
  const match = /<style>([\s\S]*?)<\/style>/.exec(source);
  if (!match) throw new Error(`No <style> block in ${id}/index.astro`);
  return (match[1] ?? "").replace(/\/\*[\s\S]*?\*\//g, "");
}

// Flatten the scoped CSS into top-level rule blocks. The img-safety rules are
// declared at the top level (never inside @media) for every module covered
// here, so a simple innermost-brace scan captures each rule's full selector
// and declaration body.
interface CssRule {
  selector: string;
  body: string;
}
function cssRules(css: string): CssRule[] {
  const rules: CssRule[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    rules.push({ selector: m[1].trim(), body: m[2].trim() });
  }
  return rules;
}

// Extract the inner HTML of the first element bearing `className`, balancing
// that element's own tag so nested same-tag elements don't truncate early.
// Works for both <div> body containers and the <blockquote> testimonials quote.
function innerHtmlOf(html: string, className: string): string {
  const openRe = new RegExp(
    `<([a-z0-9]+)\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>`,
    "i",
  );
  const open = openRe.exec(html);
  if (!open) {
    throw new Error(`element with class "${className}" not found in rendered HTML`);
  }
  const tag = open[1];
  const start = open.index + open[0].length;
  const tagRe = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
  tagRe.lastIndex = start;
  let depth = 1;
  let t: RegExpExecArray | null;
  while ((t = tagRe.exec(html)) !== null) {
    if (t[1] === "/") {
      depth--;
      if (depth === 0) return html.slice(start, t.index);
    } else {
      depth++;
    }
  }
  return html.slice(start);
}

// One inline image emitted through a markdown body, plus the body container it
// must land inside.
interface BodyCheck {
  container: string;
  src: string;
}

// Per-module render config + the body container(s) whose markdown <img> the
// catalog constrains. Each module is rendered through the real component with a
// markdown body carrying a uniquely-srced inline image.
interface ModuleCase {
  id: string;
  render: () => Promise<string>;
  checks: BodyCheck[];
}

const IMG = (src: string) => `<p><img src="${src}" alt="Inline diagram"></p>`;

const MODULE_CASES: ModuleCase[] = [
  {
    id: "hero",
    render: async () => {
      const container = await AstroContainer.create();
      return container.renderToString(Hero, {
        props: {
          variant: "bg-color",
          heading: "Welcome",
          subhead: IMG("/assets/hero-inline.png"),
        },
      });
    },
    checks: [{ container: "fc-hero__subhead", src: "/assets/hero-inline.png" }],
  },
  {
    id: "text-block",
    render: async () => {
      const container = await AstroContainer.create();
      return container.renderToString(TextBlock, {
        props: {
          variant: "prose",
          body: IMG("/assets/text-block-inline.png"),
        },
      });
    },
    checks: [
      { container: "fc-text-block__body", src: "/assets/text-block-inline.png" },
    ],
  },
  {
    id: "services-grid",
    render: async () => {
      const container = await AstroContainer.create();
      return container.renderToString(ServicesGrid, {
        props: {
          variant: "three-col",
          subhead: IMG("/assets/services-subhead-inline.png"),
          items: [
            {
              title: "Service one",
              body: IMG("/assets/services-body-inline.png"),
            },
          ],
        },
      });
    },
    checks: [
      {
        container: "fc-services-grid__subhead",
        src: "/assets/services-subhead-inline.png",
      },
      {
        container: "fc-services-grid__body",
        src: "/assets/services-body-inline.png",
      },
    ],
  },
  {
    id: "split-section",
    render: async () => {
      const container = await AstroContainer.create();
      return container.renderToString(SplitSection, {
        props: {
          variant: "image-left",
          image: {
            id: "split-media",
            src: "/assets/split-media.jpg",
            alt: "Section media",
          },
          heading: "Our approach",
          body: IMG("/assets/split-body-inline.png"),
        },
      });
    },
    checks: [
      { container: "fc-split-section__body", src: "/assets/split-body-inline.png" },
    ],
  },
  {
    id: "testimonials",
    render: async () => {
      const container = await AstroContainer.create();
      return container.renderToString(Testimonials, {
        props: {
          variant: "single",
          items: [
            {
              quote: IMG("/assets/testimonial-inline.png"),
              name: "Dana Reviewer",
            },
          ],
        },
      });
    },
    checks: [
      { container: "fc-testimonials__quote", src: "/assets/testimonial-inline.png" },
    ],
  },
  {
    id: "banner",
    render: async () => {
      const container = await AstroContainer.create();
      return container.renderToString(Banner, {
        props: {
          variant: "simple",
          heading: "Limited offer",
          subhead: IMG("/assets/banner-inline.png"),
        },
      });
    },
    checks: [{ container: "fc-banner__subhead", src: "/assets/banner-inline.png" }],
  },
];

describe("UAT AC-772: markdown bodies constrain inline images so they cannot overflow the layout", () => {
  it("test_UAT_AC772_markdown_bodies_constrain_inline_images", async () => {
    for (const mod of MODULE_CASES) {
      const html = await mod.render();
      const css = await readScopedCss(mod.id);
      const rules = cssRules(css);

      for (const check of mod.checks) {
        // 1. The inline image is emitted INSIDE the module's body container.
        const inner = innerHtmlOf(html, check.container);
        expect(
          inner,
          `${mod.id}: inline image ${check.src} should render inside .${check.container}`,
        ).toMatch(
          new RegExp(`<img\\b[^>]*src="${check.src.replace(/[/.]/g, "\\$&")}"`),
        );

        // 2. The body container scopes inline <img> to the safe dimensions.
        const imgRule = rules.find((r) =>
          r.selector.includes(`.${check.container} :global(img)`),
        );
        expect(
          imgRule,
          `${mod.id}: scoped CSS must define a ".${check.container} :global(img)" rule`,
        ).toBeDefined();
        expect(
          imgRule!.body,
          `${mod.id}: .${check.container} inline <img> must set max-width: 100%`,
        ).toMatch(/max-width:\s*100%/);
        expect(
          imgRule!.body,
          `${mod.id}: .${check.container} inline <img> must set height: auto`,
        ).toMatch(/height:\s*auto/);
        expect(
          imgRule!.body,
          `${mod.id}: .${check.container} inline <img> must set display: block`,
        ).toMatch(/display:\s*block/);
      }
    }
  });
});
