/**
 * <DigestReport> — chat-card variant for the structured `reference_digest`
 * tool_result produced by REQ-21's `analyze_page` AI tool.
 *
 * Registered with the REQ-13 dispatcher under kind: 'reference_digest'. The
 * renderer reads the digest record from `result.applied.data.digest` (and
 * the pre-rendered markdown body from `result.applied.data.digestMarkdown`)
 * and assembles:
 *
 *   - `info`-toned ChatCard with header "Reference Digest — {sourceUrl}"
 *   - Body: the digest markdown rendered via the shared marked+DOMPurify
 *     pipeline (same path as assistant messages)
 *   - Asset inventory sub-section: per-kind counts (img / background /
 *     video) + a thumbnail strip per kind so the operator can see at a
 *     glance what the transcription will consider
 *   - Actions row: "Convert this site" (emits a `fc:digest-convert-requested`
 *     CustomEvent carrying the digest — REQ-28 listens for this and starts
 *     the Layer B transcription) + "Discard" (collapses the card)
 */

import { createChatCard } from "./chat-card.js";
import {
  registerToolResultRenderer,
  type ToolResultRenderer,
  type ToolResultRendererContext,
} from "./tool-result-renderers.js";

interface DigestAssetRecord {
  readonly url: string;
  readonly kind: "img" | "background" | "video";
  readonly alt?: string;
  readonly classification: string;
  readonly width?: number;
  readonly height?: number;
  readonly references: number;
}

interface DigestRecord {
  readonly schemaVersion: number;
  readonly sourceUrl: string;
  readonly fetchedAt: string;
  readonly fetchPath: "static" | "rendered";
  readonly summary: string;
  readonly signals: {
    readonly assetInventory: ReadonlyArray<DigestAssetRecord>;
  };
}

interface DigestPayload {
  readonly kind: string;
  readonly digest: DigestRecord;
  readonly digestMarkdown: string;
  readonly cache?: string;
}

export const createDigestReportRenderer: ToolResultRenderer = (
  ctx: ToolResultRendererContext,
): Node => {
  const { doc, result, renderMarkdown } = ctx;

  if (!result.ok) {
    return createChatCard(doc, {
      title: "Reference Digest — failed",
      tone: "danger",
      icon: "!",
      body: "analyze_page returned an error",
    }).root;
  }

  const data = result.applied.data as DigestPayload | undefined;
  if (!data || !data.digest || !data.digestMarkdown) {
    return createChatCard(doc, {
      title: "Reference Digest — invalid payload",
      tone: "warning",
      icon: "?",
      body: "tool_result is missing { digest, digestMarkdown } data",
    }).root;
  }

  const digest = data.digest;
  const body = doc.createElement("div");
  body.className = "fc-digest-report";
  body.setAttribute("data-fc-digest-report", "");
  body.setAttribute("data-fc-digest-source-url", digest.sourceUrl);
  if (data.cache) body.setAttribute("data-fc-digest-cache", data.cache);

  body.appendChild(renderMarkdown(data.digestMarkdown));
  body.appendChild(renderAssetStrip(doc, digest.signals.assetInventory));

  const card = createChatCard(doc, {
    title: `Reference Digest — ${digest.sourceUrl}`,
    tone: "info",
    icon: "◆",
    body,
    actions: [
      {
        label: "Convert this site",
        variant: "primary",
        onClick: (): void => {
          doc.dispatchEvent(
            new CustomEvent("fc:digest-convert-requested", {
              detail: { digest, digestMarkdown: data.digestMarkdown },
              bubbles: true,
            }),
          );
        },
      },
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

function renderAssetStrip(
  doc: Document,
  inventory: ReadonlyArray<DigestAssetRecord>,
): HTMLElement {
  const strip = doc.createElement("section");
  strip.className = "fc-digest-report__inventory";
  strip.setAttribute("data-fc-digest-inventory", "");

  const imgCount = inventory.filter((a) => a.kind === "img").length;
  const bgCount = inventory.filter((a) => a.kind === "background").length;
  const videoCount = inventory.filter((a) => a.kind === "video").length;

  const counts = doc.createElement("div");
  counts.className = "fc-digest-report__counts";
  counts.setAttribute("data-fc-digest-counts", "");
  counts.setAttribute("data-fc-digest-count-img", String(imgCount));
  counts.setAttribute("data-fc-digest-count-background", String(bgCount));
  counts.setAttribute("data-fc-digest-count-video", String(videoCount));
  counts.textContent = `Inventory: ${imgCount} images · ${bgCount} backgrounds · ${videoCount} videos`;
  strip.appendChild(counts);

  for (const kind of ["img", "background", "video"] as const) {
    const group = doc.createElement("div");
    group.className = `fc-digest-report__group fc-digest-report__group--${kind}`;
    group.setAttribute("data-fc-digest-group", kind);
    const matching = inventory.filter((a) => a.kind === kind);
    if (matching.length === 0) {
      group.setAttribute("data-fc-digest-empty", "true");
      continue;
    }
    for (const asset of matching) {
      group.appendChild(renderAssetThumbnail(doc, asset));
    }
    strip.appendChild(group);
  }
  return strip;
}

function renderAssetThumbnail(
  doc: Document,
  asset: DigestAssetRecord,
): HTMLElement {
  const wrap = doc.createElement("figure");
  wrap.className = `fc-digest-report__thumb fc-digest-report__thumb--${asset.kind}`;
  wrap.setAttribute("data-fc-digest-thumb", asset.url);
  wrap.setAttribute("data-fc-digest-thumb-kind", asset.kind);
  wrap.setAttribute("data-fc-digest-thumb-classification", asset.classification);
  if (asset.kind === "img" || asset.kind === "background") {
    const img = doc.createElement("img");
    img.setAttribute("src", asset.url);
    img.setAttribute("alt", asset.alt ?? "");
    img.setAttribute("loading", "lazy");
    wrap.appendChild(img);
  } else if (asset.kind === "video") {
    const label = doc.createElement("span");
    label.textContent = `▶ ${asset.url}`;
    wrap.appendChild(label);
  }
  const caption = doc.createElement("figcaption");
  caption.textContent = asset.classification;
  wrap.appendChild(caption);
  return wrap;
}

/**
 * Side-effect registration: call once at boot to plug the digest renderer
 * into the REQ-13 dispatcher. Idempotent — re-calling overwrites the
 * registration with the same function reference.
 */
export function registerDigestReport(): void {
  registerToolResultRenderer("reference_digest", createDigestReportRenderer);
}
