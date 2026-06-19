/**
 * Minimal ambient declaration for @cloudflare/puppeteer — kept to the surface
 * we actually call so typecheck succeeds without pinning the runtime version
 * here. The real types ship with the package; this shim covers
 * launch() → Browser → newPage() → Page chains used by browser-driver.ts.
 */
declare module "@cloudflare/puppeteer" {
  export interface Page {
    setViewport(opts: { width: number; height: number }): Promise<void>;
    goto(url: string, opts: { waitUntil: string; timeout: number }): Promise<unknown>;
    screenshot(opts: { fullPage: boolean; type: "png" }): Promise<Uint8Array>;
    evaluate(scriptOrFn: string): Promise<unknown>;
    content(): Promise<string>;
    url(): string;
    close(): Promise<void>;
  }

  export interface Browser {
    newPage(): Promise<Page>;
    close(): Promise<void>;
  }

  interface Puppeteer {
    launch(binding: unknown): Promise<Browser>;
  }

  const puppeteer: Puppeteer;
  export default puppeteer;
}
