import type { Site } from "@1stcontact/site-schema";
import { renderSiteToHtml } from "@1stcontact/framework/render";

/**
 * Writes the site rendered as HTML into the same-origin iframe's document.
 * Per DOC-8 §3.2 we set contents via document.open/write/close — no postMessage,
 * no rebuild round-trip.
 */
export function renderSiteIntoIframe(
  iframe: HTMLIFrameElement,
  site: Site,
): void {
  const html = renderSiteToHtml(site);
  const doc = iframe.contentDocument;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
}
