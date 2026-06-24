/**
 * REQ-51 — <PreviewDigestReport> chat-card variant for the structured
 * `preview_digest` tool_result produced by the `preview_generated_page`
 * AI tool.
 *
 * Mirror of <DigestReport>. The key visible differences:
 *   - Header reads "Preview — {pageId}" so the operator can tell at a glance
 *     this is the AI looking at its own work, not at an external site.
 *   - When `inspirationDelta` is present, a "vs. inspiration" section appears
 *     below the screenshot strip with the delta paragraph rendered as markdown.
 *   - Action row: "Discard" only (there is no "Convert this site" affordance
 *     for self-preview cards — the conversion source is the external digest).
 *
 * Registered with the REQ-13 dispatcher under kind: 'preview_digest'.
 */

import { createChatCard } from "./chat-card.js";
import {
  registerToolResultRenderer,
  type ToolResultRenderer,
  type ToolResultRendererContext,
} from "./tool-result-renderers.js";

interface DigestScreenshotKeys {
  readonly mobile?: string;
  readonly tablet?: string;
  readonly desktop?: string;
}

interface PreviewSource {
  readonly accountId: string;
  readonly draftId: string;
  readonly pageId: string;
  readonly capturedAt: string;
}

interface PreviewDigestRecord {
  readonly schemaVersion: number;
  readonly sourceUrl: string;
  readonly fetchedAt: string;
  readonly fetchPath: "static" | "rendered";
  readonly summary: string;
  readonly screenshotKeys?: DigestScreenshotKeys;
  readonly previewSource: PreviewSource;
}

interface PreviewDigestPayload {
  readonly kind: string;
  readonly digest: PreviewDigestRecord;
  readonly digestMarkdown: string;
  readonly inspirationDelta?: string;
}

export const createPreviewDigestReportRenderer: ToolResultRenderer = (
  ctx: ToolResultRendererContext,
): Node => {
  const { doc, result, renderMarkdown } = ctx;

  if (!result.ok) {
    return createChatCard(doc, {
      title: "Preview — failed",
      tone: "danger",
      icon: "!",
      body: "preview_generated_page returned an error",
    }).root;
  }

  const data = result.applied.data as PreviewDigestPayload | undefined;
  if (!data || !data.digest || !data.digestMarkdown) {
    return createChatCard(doc, {
      title: "Preview — invalid payload",
      tone: "warning",
      icon: "?",
      body: "tool_result is missing { digest, digestMarkdown } data",
    }).root;
  }

  const digest = data.digest;
  const body = doc.createElement("div");
  body.className = "fc-preview-digest-report";
  body.setAttribute("data-fc-preview-digest-report", "");
  body.setAttribute(
    "data-fc-preview-digest-page-id",
    digest.previewSource.pageId,
  );
  body.setAttribute(
    "data-fc-preview-digest-account-id",
    digest.previewSource.accountId,
  );
  body.setAttribute(
    "data-fc-preview-digest-draft-id",
    digest.previewSource.draftId,
  );
  body.setAttribute(
    "data-fc-preview-digest-captured-at",
    digest.previewSource.capturedAt,
  );

  const screenshotStrip = renderPreviewScreenshotStrip(doc, digest.screenshotKeys);
  if (screenshotStrip) body.appendChild(screenshotStrip);

  if (data.inspirationDelta && data.inspirationDelta.length > 0) {
    body.appendChild(renderInspirationDelta(doc, data.inspirationDelta, renderMarkdown));
  }

  body.appendChild(renderMarkdown(data.digestMarkdown));

  const card = createChatCard(doc, {
    title: `Preview — ${digest.previewSource.pageId}`,
    tone: "info",
    icon: "◇",
    body,
    actions: [
      {
        label: "Discard",
        variant: "secondary",
        onClick: (): void => {
          card.setCollapsed(true);
        },
      },
    ],
    onToggleCollapse: () => {},
  });
  return card.root;
};

function renderPreviewScreenshotStrip(
  doc: Document,
  keys: DigestScreenshotKeys | undefined,
): HTMLElement | null {
  if (!keys) return null;
  const viewports: Array<{ name: "mobile" | "tablet" | "desktop"; key?: string }> = [
    { name: "mobile", key: keys.mobile },
    { name: "tablet", key: keys.tablet },
    { name: "desktop", key: keys.desktop },
  ];
  const present = viewports.filter(
    (v) => typeof v.key === "string" && v.key.length > 0,
  );
  if (present.length === 0) return null;

  const strip = doc.createElement("section");
  strip.className = "fc-preview-digest-report__screenshots";
  strip.setAttribute("data-fc-preview-digest-screenshots", "");
  for (const vp of present) {
    const figure = doc.createElement("figure");
    figure.className = `fc-preview-digest-report__screenshot fc-preview-digest-report__screenshot--${vp.name}`;
    figure.setAttribute("data-fc-preview-digest-screenshot", vp.name);
    figure.setAttribute(
      "data-fc-preview-digest-screenshot-key",
      vp.key as string,
    );
    const img = doc.createElement("img");
    img.setAttribute("src", `/assets/${vp.key as string}`);
    img.setAttribute("alt", `${vp.name} preview screenshot`);
    img.setAttribute("loading", "lazy");
    figure.appendChild(img);
    const caption = doc.createElement("figcaption");
    caption.textContent = vp.name;
    figure.appendChild(caption);
    strip.appendChild(figure);
  }
  return strip;
}

function renderInspirationDelta(
  doc: Document,
  delta: string,
  renderMarkdown: (md: string) => Node,
): HTMLElement {
  const section = doc.createElement("section");
  section.className = "fc-preview-digest-report__delta";
  section.setAttribute("data-fc-preview-digest-delta", "");

  const heading = doc.createElement("h4");
  heading.className = "fc-preview-digest-report__delta-heading";
  heading.textContent = "vs. inspiration";
  section.appendChild(heading);

  const body = doc.createElement("div");
  body.className = "fc-preview-digest-report__delta-body";
  body.appendChild(renderMarkdown(delta));
  section.appendChild(body);

  return section;
}

/**
 * Side-effect registration: call once at boot to plug the preview-digest
 * renderer into the REQ-13 dispatcher. Idempotent — re-calling overwrites
 * the registration with the same function reference.
 */
export function registerPreviewDigestReport(): void {
  registerToolResultRenderer("preview_digest", createPreviewDigestReportRenderer);
}
