import type { Site } from "@1stcontact/site-schema";
import { renderSiteToHtml } from "@1stcontact/framework/render";

interface PreviewState {
  site: Site;
  currentPageId: string | undefined;
  hashListenerInstalled: boolean;
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
    state = { site, currentPageId: undefined, hashListenerInstalled: false };
    stateByIframe.set(iframe, state);
  }
  state.site = site;

  applyHashIfPageNav(iframe, state);
  rewriteIframe(iframe, state);

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
  });
  const doc = iframe.contentDocument;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
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
