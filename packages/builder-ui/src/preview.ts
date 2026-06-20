import type { AssetRef, Site } from "@1stcontact/site-schema";
import { renderSiteToHtml } from "@1stcontact/framework/render";

interface PreviewState {
  site: Site;
  currentPageId: string | undefined;
  hashListenerInstalled: boolean;
  /**
   * Cache of resolved markdown by R2 key for AssetRef-text references in
   * markdown content fields. Populated by an async pre-fetch in
   * `renderSiteIntoIframe`, consumed by the sync renderer via a closure-bound
   * `resolveAsset`.
   */
  textAssetCache: Map<string, string>;
}

const stateByIframe = new WeakMap<HTMLIFrameElement, PreviewState>();

/**
 * Writes the site rendered as HTML into the same-origin iframe's document.
 * Per DOC-8 §3.2 we set contents via document.open/write/close — no postMessage,
 * no rebuild round-trip.
 *
 * Renders with target=preview so nav links use fragment hrefs (#/<pageId>).
 * Installs a hashchange listener on the iframe's contentWindow so clicking a
 * page tab re-renders that page in place — without navigating the iframe
 * away to a control-app URL (BUG-3). In-page anchors (e.g. #contact) do not
 * trigger a page switch; they let the browser scroll within the current page.
 */
export function renderSiteIntoIframe(
  iframe: HTMLIFrameElement,
  site: Site,
): void {
  let state = stateByIframe.get(iframe);
  if (!state) {
    state = {
      site,
      currentPageId: undefined,
      hashListenerInstalled: false,
      textAssetCache: new Map(),
    };
    stateByIframe.set(iframe, state);
  }
  state.site = site;

  applyHashIfPageNav(iframe, state);
  rewriteIframe(iframe, state);

  // REQ-33 — Asynchronously fetch any AssetRef-text body copy referenced by
  // markdown content fields, then re-render once the cache is populated.
  // Sync render above uses whatever's already cached (alt fallback on cold);
  // the post-fetch re-render brings the resolved bytes in.
  prefetchTextAssets(state).then((didChange) => {
    if (didChange) rewriteIframe(iframe, state!);
  });

  const win = iframe.contentWindow;
  if (win && !state.hashListenerInstalled) {
    win.addEventListener("hashchange", () => {
      const s = stateByIframe.get(iframe);
      if (!s) return;
      const before = s.currentPageId;
      applyHashIfPageNav(iframe, s);
      if (s.currentPageId !== before) rewriteIframe(iframe, s);
    });
    state.hashListenerInstalled = true;
  }
}

function rewriteIframe(iframe: HTMLIFrameElement, state: PreviewState): void {
  const html = renderSiteToHtml(state.site, {
    target: "preview",
    pageId: state.currentPageId,
    resolveAsset: (ref: AssetRef) => {
      if (!isTextRef(ref)) return undefined;
      return state.textAssetCache.get(ref.src);
    },
  });
  const doc = iframe.contentDocument;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
}

function isTextRef(ref: AssetRef): ref is AssetRef & { kind: "text" } {
  return (ref as { kind?: string }).kind === "text";
}

async function prefetchTextAssets(state: PreviewState): Promise<boolean> {
  const refs = collectTextRefs(state.site);
  let changed = false;
  await Promise.all(
    refs.map(async (src) => {
      if (state.textAssetCache.has(src)) return;
      try {
        const url = srcToFetchUrl(src);
        const resp = await fetch(url);
        if (!resp.ok) return;
        const body = await resp.text();
        state.textAssetCache.set(src, body);
        changed = true;
      } catch {
        // Best-effort prefetch; renderer falls back to alt on miss.
      }
    }),
  );
  return changed;
}

function srcToFetchUrl(src: string): string {
  // Builder preview fetches markdown via the existing assets route, which is
  // already same-origin (no CORS), and treats response body as text.
  // R2 keys are passed through unchanged into the GET prefix.
  if (src.startsWith("/")) return src;
  return `/assets/${src}`;
}

function collectTextRefs(site: Site): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const page of site.pages) {
    for (const m of page.modules) {
      if (!m.content) continue;
      collectFromValue(m.content, out, seen);
    }
  }
  return out;
}

function collectFromValue(
  value: unknown,
  out: string[],
  seen: Set<string>,
): void {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const v of value) collectFromValue(v, out, seen);
    return;
  }
  if (typeof value !== "object") return;
  const obj = value as Record<string, unknown>;
  if (obj.kind === "text" && typeof obj.src === "string") {
    if (!seen.has(obj.src)) {
      seen.add(obj.src);
      out.push(obj.src);
    }
    return;
  }
  for (const v of Object.values(obj)) collectFromValue(v, out, seen);
}

function applyHashIfPageNav(iframe: HTMLIFrameElement, state: PreviewState): void {
  const hash = iframe.contentWindow?.location?.hash ?? "";
  const requested = pageIdFromHash(hash);
  if (requested === undefined) return; // not a page-nav hash; leave currentPageId alone
  if (requested === "") {
    state.currentPageId = state.site.pages[0]?.id;
    return;
  }
  const match = state.site.pages.find((p) => p.id === requested);
  state.currentPageId = match ? match.id : state.site.pages[0]?.id;
}

function pageIdFromHash(hash: string): string | undefined {
  // "#/menu" → "menu"; "#/" or "#" → "" (means home); "#anchor" → undefined.
  if (hash === "" || hash === "#") return "";
  const m = /^#\/([^/]*)\/?$/.exec(hash);
  if (!m) return undefined;
  return m[1] ?? "";
}
