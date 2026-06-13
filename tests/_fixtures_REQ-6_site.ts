import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(__dirname, "..");
export const FIXTURE_SITE_DIR = resolve(REPO_ROOT, "sites/1stcontact");

export async function writeFixtureSite(
  siteDir: string,
  site: unknown,
  assets: Record<string, Buffer> = {},
): Promise<void> {
  await mkdir(siteDir, { recursive: true });
  await writeFile(resolve(siteDir, "site.json"), JSON.stringify(site, null, 2));
  if (Object.keys(assets).length > 0) {
    const assetsDir = resolve(siteDir, "assets");
    await mkdir(assetsDir, { recursive: true });
    for (const [name, buf] of Object.entries(assets)) {
      await writeFile(resolve(assetsDir, name), buf);
    }
  }
}

export function makeFixtureSite(overrides?: { theme?: object }): unknown {
  const base = {
    config: { businessName: "Fixture Co" },
    theme: {
      palette: {
        bg: "#ffffff",
        surface: "#f5f5f5",
        surfaceSubtle: "#fafafa",
        surfaceInverse: "#111111",
        text: "#111111",
        muted: "#666666",
        primary: "#1a73e8",
        accent: "#f59e0b",
        border: "#dddddd",
      },
      typography: {
        family: {
          heading: "'Inter', sans-serif",
          body: "'Inter', sans-serif",
        },
        scale: {
          xs: "0.75rem",
          sm: "0.875rem",
          base: "1rem",
          lg: "1.125rem",
          xl: "1.25rem",
          "2xl": "1.5rem",
          "3xl": "1.875rem",
          "4xl": "2.25rem",
          "5xl": "3rem",
        },
        weights: {
          regular: "400",
          medium: "500",
          semibold: "600",
          bold: "700",
          black: "900",
        },
        lineHeights: { tight: "1.2", normal: "1.5", relaxed: "1.75" },
      },
      spacing: {
        "0": "0",
        "1": "0.25rem",
        "2": "0.5rem",
        "3": "0.75rem",
        "4": "1rem",
        "6": "1.5rem",
        "8": "2rem",
        "12": "3rem",
        "16": "4rem",
        "24": "6rem",
      },
      radius: {
        none: "0",
        sm: "0.25rem",
        md: "0.5rem",
        lg: "1rem",
        full: "9999px",
      },
      shadow: {
        none: "none",
        sm: "0 1px 2px rgba(0,0,0,0.05)",
        md: "0 4px 6px rgba(0,0,0,0.08)",
        lg: "0 8px 16px rgba(0,0,0,0.12)",
      },
      container: {
        narrow: "45rem",
        default: "72rem",
        wide: "80rem",
        bleed: "100%",
      },
      breakpoints: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px" },
    },
    nav: { pattern: "in-page-anchors", entries: [] },
    pages: [
      {
        id: "home",
        slug: "/",
        title: "Fixture Home",
        seoMeta: { title: "Fixture Home", description: "Fixture description" },
        modules: [
          {
            id: "hero-1",
            type: "hero",
            version: 1,
            variant: "bg-color",
            content: {
              heading: "Hello",
              subhead: "<p>Welcome.</p>",
            },
          },
          {
            id: "block-1",
            type: "text-block",
            version: 1,
            variant: "prose",
            content: {
              heading: "Section",
              body: "<p>Body.</p>",
            },
          },
        ],
      },
    ],
  };
  if (overrides?.theme) {
    return { ...base, theme: { ...base.theme, ...overrides.theme } };
  }
  return base;
}
