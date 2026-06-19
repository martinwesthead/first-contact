import {
  COMPUTED_EXTRACTION_SCRIPT,
  resolveUrl,
  type BrowserDriver,
  type ComputedBackgroundAsset,
  type ComputedStyles,
  type DriverResult,
  type Viewport,
  type ViewportName,
} from "@1stcontact/extractor";

/**
 * Module-level injection hook for tests. Production callers (the Worker
 * `analyze_page` handler) read the binding from env.BROWSER and call
 * `makePuppeteerDriver`. Tests register a deterministic fake driver via
 * `setDriverFactoryForTest` so unit tests never spin up a real browser.
 */
type DriverFactory = (binding: unknown) => BrowserDriver;

let testFactoryOverride: DriverFactory | null = null;

export function setDriverFactoryForTest(factory: DriverFactory | null): void {
  testFactoryOverride = factory;
}

export function resolveDriverFactory(): DriverFactory {
  return testFactoryOverride ?? makePuppeteerDriver;
}

/** Network-idle wait — 10s hard cap per REQ-22. */
const NETWORKIDLE_TIMEOUT_MS = 10_000;

interface InPageResult {
  body: { family: string; size: string; weight: string; backgroundColor: string; backgroundImage: string };
  h1: { family: string; size: string; weight: string; backgroundColor: string; backgroundImage: string };
  h2: { family: string; size: string; weight: string; backgroundColor: string; backgroundImage: string };
  h3: { family: string; size: string; weight: string; backgroundColor: string; backgroundImage: string };
  primaryBackgroundColor: string;
  bgAssets: Array<{ url: string; selector: string }>;
}

interface PuppeteerPage {
  setViewport(opts: { width: number; height: number }): Promise<void>;
  goto(url: string, opts: { waitUntil: string; timeout: number }): Promise<unknown>;
  screenshot(opts: { fullPage: boolean; type: "png" }): Promise<Uint8Array>;
  evaluate(scriptOrFn: string): Promise<InPageResult>;
  content(): Promise<string>;
  url(): string;
  close(): Promise<void>;
}

interface PuppeteerBrowser {
  newPage(): Promise<PuppeteerPage>;
  close(): Promise<void>;
}

interface PuppeteerModule {
  default: { launch(binding: unknown): Promise<PuppeteerBrowser> };
}

/**
 * Real @cloudflare/puppeteer driver. Dynamic import keeps the dependency at
 * the binding edge — the extractor and the rest of the worker stay free of
 * puppeteer types. The module is declared via a local ambient shim so
 * typecheck passes without installing the runtime dep.
 */
export function makePuppeteerDriver(binding: unknown): BrowserDriver {
  return {
    async renderForViewports(
      url: string,
      viewports: readonly Viewport[],
    ): Promise<DriverResult> {
      const start = Date.now();
      // String-indirect import so neither Vite nor esbuild pre-resolve the
      // module at build time. The package is only loadable inside a Workers
      // runtime with the BROWSER binding present. Tests inject a fake driver
      // via setDriverFactoryForTest and never reach this path.
      const modSpecifier = "@cloudflare/puppeteer";
      const mod = (await import(
        /* @vite-ignore */ modSpecifier
      )) as unknown as PuppeteerModule;
      const browser = await mod.default.launch(binding);
      try {
        const screenshots: Partial<Record<ViewportName, Uint8Array>> = {};
        let lastHtml = "";
        let lastFinalUrl = url;
        let lastComputed: InPageResult | null = null;
        const page = await browser.newPage();
        try {
          for (const vp of viewports) {
            await page.setViewport({ width: vp.width, height: vp.height });
            try {
              await page.goto(url, {
                waitUntil: "networkidle0",
                timeout: NETWORKIDLE_TIMEOUT_MS,
              });
            } catch {
              // networkidle didn't settle — capture what's there.
            }
            try {
              screenshots[vp.name] = await page.screenshot({ fullPage: true, type: "png" });
            } catch {
              // skip viewport; driver result will omit this key
            }
            if (vp.name === "desktop") {
              lastFinalUrl = page.url();
              try {
                lastHtml = await page.content();
              } catch {
                lastHtml = "";
              }
              try {
                lastComputed = await page.evaluate(COMPUTED_EXTRACTION_SCRIPT);
              } catch {
                lastComputed = null;
              }
            }
          }
        } finally {
          await page.close();
        }
        const durationSeconds = Math.max(1, Math.round((Date.now() - start) / 1000));
        const computed = lastComputed ?? emptyInPage();
        return {
          html: lastHtml,
          computedStyles: shapeComputed(computed),
          computedBackgroundAssets: resolveAssets(computed.bgAssets, lastFinalUrl),
          screenshots,
          durationSeconds,
        };
      } finally {
        try {
          await browser.close();
        } catch {
          // best-effort close; the binding may already have terminated.
        }
      }
    },
  };
}

function emptyInPage(): InPageResult {
  const empty = { family: "", size: "", weight: "", backgroundColor: "", backgroundImage: "" };
  return {
    body: empty,
    h1: empty,
    h2: empty,
    h3: empty,
    primaryBackgroundColor: "",
    bgAssets: [],
  };
}

function shapeComputed(raw: InPageResult): ComputedStyles {
  return {
    body: {
      family: raw.body.family,
      size: raw.body.size,
      weight: raw.body.weight,
      backgroundColor: raw.body.backgroundColor,
    },
    h1: { family: raw.h1.family, size: raw.h1.size, weight: raw.h1.weight },
    h2: { family: raw.h2.family, size: raw.h2.size, weight: raw.h2.weight },
    h3: { family: raw.h3.family, size: raw.h3.size, weight: raw.h3.weight },
    primaryBackgroundColor: raw.primaryBackgroundColor,
  };
}

function resolveAssets(
  raw: ReadonlyArray<{ url: string; selector: string }>,
  baseUrl: string,
): ComputedBackgroundAsset[] {
  return raw
    .filter((a) => a.url.length > 0)
    .map((a) => ({ url: resolveUrl(a.url, baseUrl), selector: a.selector }));
}
