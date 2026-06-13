import type { Site } from "@1stcontact/site-schema";
import { renderSiteIntoIframe } from "../preview.js";

export type ViewportPreset = "mobile" | "tablet" | "desktop";

export interface PreviewPanelHandle {
  readonly root: HTMLElement;
  readonly iframe: HTMLIFrameElement;
  setViewport(preset: ViewportPreset): void;
  getViewport(): ViewportPreset;
  render(site: Site): void;
}

export const VIEWPORT_PRESETS: Readonly<Record<ViewportPreset, string>> = {
  mobile: "375px",
  tablet: "768px",
  desktop: "100%",
};

/**
 * Vanilla DOM preview panel — same-origin iframe + viewport switcher.
 * (DOC-8 §3.2 + §3.4)
 */
export function createPreviewPanel(parent: HTMLElement): PreviewPanelHandle {
  const doc = parent.ownerDocument;
  const root = doc.createElement("div");
  root.className = "fc-preview";
  root.setAttribute("data-fc-preview", "");

  const toolbar = doc.createElement("div");
  toolbar.className = "fc-preview__toolbar";

  let viewport: ViewportPreset = "desktop";

  const buttons: Record<ViewportPreset, HTMLButtonElement> = {
    mobile: makeViewportButton(doc, "mobile", "Mobile"),
    tablet: makeViewportButton(doc, "tablet", "Tablet"),
    desktop: makeViewportButton(doc, "desktop", "Desktop"),
  };
  toolbar.appendChild(buttons.mobile);
  toolbar.appendChild(buttons.tablet);
  toolbar.appendChild(buttons.desktop);

  const iframe = doc.createElement("iframe");
  iframe.className = "fc-preview__iframe";
  iframe.setAttribute("data-fc-preview-iframe", "");
  iframe.setAttribute("title", "Site preview");
  iframe.style.border = "0";
  iframe.style.height = "100%";

  root.appendChild(toolbar);
  root.appendChild(iframe);
  parent.appendChild(root);

  function setViewport(preset: ViewportPreset): void {
    viewport = preset;
    iframe.style.width = VIEWPORT_PRESETS[preset];
    for (const [key, btn] of Object.entries(buttons) as [
      ViewportPreset,
      HTMLButtonElement,
    ][]) {
      if (key === preset) {
        btn.setAttribute("aria-pressed", "true");
        btn.classList.add("is-active");
      } else {
        btn.setAttribute("aria-pressed", "false");
        btn.classList.remove("is-active");
      }
    }
  }

  buttons.mobile.addEventListener("click", () => setViewport("mobile"));
  buttons.tablet.addEventListener("click", () => setViewport("tablet"));
  buttons.desktop.addEventListener("click", () => setViewport("desktop"));
  setViewport("desktop");

  return {
    root,
    iframe,
    setViewport,
    getViewport: () => viewport,
    render: (site: Site) => renderSiteIntoIframe(iframe, site),
  };
}

function makeViewportButton(
  doc: Document,
  preset: ViewportPreset,
  label: string,
): HTMLButtonElement {
  const btn = doc.createElement("button");
  btn.type = "button";
  btn.className = `fc-preview__viewport fc-preview__viewport--${preset}`;
  btn.setAttribute("data-fc-viewport", preset);
  btn.textContent = label;
  return btn;
}
