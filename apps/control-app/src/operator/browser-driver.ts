import puppeteer from "@cloudflare/puppeteer";
import {
  COMPUTED_EXTRACTION_SCRIPT,
  resolveUrl,
  type BrowserDriver,
  type ComputedBackgroundAsset,
  type ComputedBoundingBox,
  type ComputedBoundingBoxes,
  type ComputedFontAsset,
  type ComputedStyles,
  type DriverResult,
  type Viewport,
  type ViewportName,
} from "@gendev/extractor";

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

interface InPageBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface InPageResult {
  body: { family: string; size: string; weight: string; backgroundColor: string; backgroundImage: string };
  h1: { family: string; size: string; weight: string; backgroundColor: string; backgroundImage: string };
  h2: { family: string; size: string; weight: string; backgroundColor: string; backgroundImage: string };
  h3: { family: string; size: string; weight: string; backgroundColor: string; backgroundImage: string };
  primaryBackgroundColor: string;
  bgAssets: Array<{ url: string; selector: string }>;
  fontAssets: Array<{ url: string; family: string }>;
  boundingBoxes: {
    hero: InPageBox | null;
    nav: InPageBox | null;
    sections: InPageBox[];
    cards: InPageBox[];
  };
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

/**
 * Cloudflare's puppeteer wrapper reuses browser sessions for efficiency, and
 * attaching to a session that's still warming up surfaces as
 * `"Unable to connect to existing session <id> (it may still be in use or not
 * ready yet) - retry or launch a new browser: TypeError: Cannot read
 * properties of null (reading 'accept')"`. Their own error message says
 * retry or launch fresh — so we do exactly that, once. A second consecutive
 * failure bubbles up to the handler.
 */
async function launchWithRetry(binding: unknown): Promise<unknown> {
  try {
    return await puppeteer.launch(binding as Parameters<typeof puppeteer.launch>[0]);
  } catch (err) {
    if (!isSessionAttachError(err)) throw err;
    // Stale session — let puppeteer pick a fresh one. CF's launch() does
    // session selection internally; we don't have a "force new" flag, so the
    // retry is just a plain re-launch and trusts the next attempt to pick a
    // healthy slot.
    return await puppeteer.launch(binding as Parameters<typeof puppeteer.launch>[0]);
  }
}

function isSessionAttachError(err: unknown): boolean {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "";
  if (!msg) return false;
  return /Unable to connect to existing session/.test(msg) ||
    /reading 'accept'/.test(msg);
}

/**
 * Real @cloudflare/puppeteer driver. Wrangler bundles `@cloudflare/puppeteer`
 * from the top-of-file static import so the worker can resolve it at runtime
 * — the earlier string-indirect dynamic-import dodge hid the dep from the
 * bundler and produced a "No such module" error at request time.
 *
 * Tests inject a fake driver via `setDriverFactoryForTest`, so the puppeteer
 * package is imported but `puppeteer.launch()` is never called in tests. The
 * package's entry has no module-load side effects, so this is safe under jsdom.
 */
export function makePuppeteerDriver(binding: unknown): BrowserDriver {
  return {
    async renderForViewports(
      url: string,
      viewports: readonly Viewport[],
    ): Promise<DriverResult> {
      const start = Date.now();
      const browser = (await launchWithRetry(binding)) as unknown as PuppeteerBrowser;
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
          computedFontAssets: resolveFontAssets(computed.fontAssets, lastFinalUrl),
          boundingBoxes: shapeBoundingBoxes(computed.boundingBoxes),
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
    fontAssets: [],
    boundingBoxes: { hero: null, nav: null, sections: [], cards: [] },
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

function resolveFontAssets(
  raw: ReadonlyArray<{ url: string; family: string }>,
  baseUrl: string,
): ComputedFontAsset[] {
  return raw
    .filter((a) => a.url.length > 0)
    .map((a) => ({ url: resolveUrl(a.url, baseUrl), family: a.family }));
}

function shapeBoundingBoxes(raw: InPageResult["boundingBoxes"]): ComputedBoundingBoxes {
  return {
    sections: raw.sections.map(toBox),
    cards: raw.cards.map(toBox),
    ...(raw.hero ? { hero: toBox(raw.hero) } : {}),
    ...(raw.nav ? { nav: toBox(raw.nav) } : {}),
  };
}

function toBox(b: { x: number; y: number; width: number; height: number }): ComputedBoundingBox {
  return { x: b.x, y: b.y, width: b.width, height: b.height };
}
