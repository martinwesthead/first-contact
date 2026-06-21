import { describe, expect, it } from "vitest";
import {
  collectExternalStylesheetUrls,
  extractExternalStylesheetAssets,
  mergeStylesheetAssets,
  extractSignals,
  type StylesheetFetcher,
} from "../packages/extractor/src/index.js";

describe("UAT FC BUG-13: discover background-image assets from external stylesheets", () => {
  it("AC1: <link rel=stylesheet> with background-image rule produces a kind='background' AssetRecord", async () => {
    const html = `<!doctype html><html><head>
      <link rel="stylesheet" href="/theme.css">
    </head><body></body></html>`;
    const css = `.hero { background-image: url('/images/hero.jpg'); }`;
    const fetcher: StylesheetFetcher = async (url) => {
      if (url === "https://acme.test/theme.css") return { ok: true, text: css };
      return { ok: false };
    };

    const assets = await extractExternalStylesheetAssets(
      html,
      "https://acme.test/",
      fetcher,
    );
    const hero = assets.find((a) => a.url.endsWith("/images/hero.jpg"));
    expect(hero?.kind).toBe("background");
    expect(hero?.classification).toBe("unknown");
    expect(hero?.url).toBe("https://acme.test/images/hero.jpg");
  });

  it("AC2: url() in external stylesheet resolves relative to the stylesheet, not the document", async () => {
    const html = `<!doctype html><html><head>
      <link rel="stylesheet" href="https://cdn.example.com/css/theme.css">
    </head><body></body></html>`;
    const css = `.hero { background-image: url(../images/hero.jpg); }`;
    const fetcher: StylesheetFetcher = async () => ({ ok: true, text: css });

    const assets = await extractExternalStylesheetAssets(
      html,
      "https://acme.test/",
      fetcher,
    );
    const hero = assets[0];
    expect(hero?.url).toBe("https://cdn.example.com/images/hero.jpg");
  });

  it("AC3: `background` shorthand and @media rules both yield background assets", async () => {
    const html = `<link rel="stylesheet" href="/styles.css">`;
    const css = `
      .panel { background: url('/panel.svg') center/cover no-repeat #fff; }
      @media (min-width: 768px) {
        .hero { background-image: url('/hero-lg.jpg'); }
      }
    `;
    const fetcher: StylesheetFetcher = async () => ({ ok: true, text: css });

    const assets = await extractExternalStylesheetAssets(
      html,
      "https://acme.test/",
      fetcher,
    );
    const panel = assets.find((a) => a.url.endsWith("/panel.svg"));
    const hero = assets.find((a) => a.url.endsWith("/hero-lg.jpg"));
    expect(panel?.kind).toBe("background");
    expect(hero?.kind).toBe("background");
  });

  it("AC4: stylesheet fetches that fail or throw are silently skipped (no exception escapes)", async () => {
    const html = `
      <link rel="stylesheet" href="/missing.css">
      <link rel="stylesheet" href="/broken.css">
      <link rel="stylesheet" href="/ok.css">
    `;
    const fetcher: StylesheetFetcher = async (url) => {
      if (url.endsWith("/missing.css")) return { ok: false };
      if (url.endsWith("/broken.css")) throw new Error("network error");
      return { ok: true, text: `.x { background-image: url('/ok.png'); }` };
    };

    const assets = await extractExternalStylesheetAssets(
      html,
      "https://acme.test/",
      fetcher,
    );
    expect(assets).toHaveLength(1);
    expect(assets[0].url).toBe("https://acme.test/ok.png");
  });

  it("AC5: data: URLs are filtered out (not external assets to mirror)", async () => {
    const html = `<link rel="stylesheet" href="/styles.css">`;
    const css = `.x { background-image: url(data:image/png;base64,AAAA); }
                 .y { background-image: url('/real.jpg'); }`;
    const fetcher: StylesheetFetcher = async () => ({ ok: true, text: css });

    const assets = await extractExternalStylesheetAssets(
      html,
      "https://acme.test/",
      fetcher,
    );
    expect(assets).toHaveLength(1);
    expect(assets[0].url).toBe("https://acme.test/real.jpg");
  });

  it("AC6: mergeStylesheetAssets folds new URLs in and increments references for ones already known", async () => {
    const staticHtml = `<!doctype html><html><head><style>
      .cta { background-image: url('/cta-bg.png'); }
    </style></head><body>
      <img src="/photo.jpg" alt="x">
    </body></html>`;
    const signals = extractSignals(staticHtml, "https://acme.test/");
    expect(signals.imagery.backgroundCount).toBe(1);

    const extra = [
      {
        url: "https://acme.test/cta-bg.png",
        kind: "background" as const,
        classification: "unknown" as const,
        references: 1,
      },
      {
        url: "https://acme.test/hero.jpg",
        kind: "background" as const,
        classification: "unknown" as const,
        references: 1,
      },
    ];
    const merged = mergeStylesheetAssets(signals, extra);

    const cta = merged.assetInventory.find((a) => a.url.endsWith("/cta-bg.png"));
    const hero = merged.assetInventory.find((a) => a.url.endsWith("/hero.jpg"));
    expect(cta?.references).toBe(2);
    expect(hero?.kind).toBe("background");
    expect(merged.imagery.backgroundCount).toBe(2);
  });

  it("AC7: collectExternalStylesheetUrls ignores <link> tags whose rel is not 'stylesheet'", () => {
    const html = `
      <link rel="preload" href="/font.woff2" as="font">
      <link rel="icon" href="/favicon.ico">
      <link rel="stylesheet" href="/real.css">
      <link rel="alternate stylesheet" href="/alt.css">
    `;
    const urls = collectExternalStylesheetUrls(html, "https://acme.test/");
    expect(urls).toContain("https://acme.test/real.css");
    expect(urls).toContain("https://acme.test/alt.css");
    expect(urls).not.toContain("https://acme.test/font.woff2");
    expect(urls).not.toContain("https://acme.test/favicon.ico");
  });

  it("AC8: empty html / no stylesheets returns no assets and never calls fetcher", async () => {
    let calls = 0;
    const fetcher: StylesheetFetcher = async () => {
      calls++;
      return { ok: true, text: "" };
    };
    const assets = await extractExternalStylesheetAssets(
      `<!doctype html><html><head></head><body></body></html>`,
      "https://acme.test/",
      fetcher,
    );
    expect(assets).toEqual([]);
    expect(calls).toBe(0);
  });
});
