import type { Site } from "@gendev/site-schema";
import { renderSiteIntoIframe } from "../preview.js";

export type ViewportPreset = "mobile" | "tablet" | "desktop";

export interface PreviewPanelHandle {
  readonly root: HTMLElement;
  readonly iframe: HTMLIFrameElement;
  setViewport(preset: ViewportPreset): void;
  getViewport(): ViewportPreset;
  render(site: Site): void;
}

export interface PreviewPanelOptions {
  /**
   * Optional click handler for a Reset button rendered at the top of the panel.
   * When provided, the panel toolbar includes a Reset button that invokes this
   * callback. When omitted, no Reset button is rendered.
   */
  onReset?: () => void;
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
export function createPreviewPanel(
  parent: HTMLElement,
  options: PreviewPanelOptions = {},
): PreviewPanelHandle {
  const doc = parent.ownerDocument;
  const root = doc.createElement("div");
  root.className = "fc-preview";
  root.setAttribute("data-fc-preview", "");
  // Without an explicit flex column the iframe's height:100% resolves against
  // an auto-height block and collapses to its intrinsic ~150px (toolbar then
  // squashes it further). Lock the preview root to a column that fills its
  // parent so the iframe can flex.
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.flex = "1 1 auto";
  root.style.minHeight = "0";
  root.style.height = "100%";

  const toolbar = doc.createElement("div");
  toolbar.className = "fc-preview__toolbar";
  toolbar.style.flex = "0 0 auto";
  toolbar.style.display = "flex";
  toolbar.style.alignItems = "center";

  let viewport: ViewportPreset = "desktop";

  const buttons: Record<ViewportPreset, HTMLButtonElement> = {
    mobile: makeViewportButton(doc, "mobile", "Mobile"),
    tablet: makeViewportButton(doc, "tablet", "Tablet"),
    desktop: makeViewportButton(doc, "desktop", "Desktop"),
  };
  toolbar.appendChild(buttons.mobile);
  toolbar.appendChild(buttons.tablet);
  toolbar.appendChild(buttons.desktop);

  if (options.onReset) {
    const onReset = options.onReset;
    const resetBtn = doc.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "fc-preview__reset";
    resetBtn.setAttribute("data-fc-preview-reset", "");
    resetBtn.textContent = "Reset";
    resetBtn.style.marginLeft = "auto";
    resetBtn.addEventListener("click", () => onReset());
    toolbar.appendChild(resetBtn);
  }

  const iframe = doc.createElement("iframe");
  iframe.className = "fc-preview__iframe";
  iframe.setAttribute("data-fc-preview-iframe", "");
  iframe.setAttribute("title", "Site preview");
  iframe.style.border = "0";
  iframe.style.flex = "1 1 auto";
  iframe.style.minHeight = "0";
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
