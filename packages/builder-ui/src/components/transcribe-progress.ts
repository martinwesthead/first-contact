/**
 * <TranscribeProgress> — live progress card for the convert flow (REQ-28
 * §IN Builder UI). Mounted via the REQ-13 dispatcher when transcribe_site
 * returns {kind: 'transcribe_site_done'}; updates in place as `action:notify`
 * SSE events arrive on the operator session channel.
 *
 * Tone: info. Header: "Converting {url}". Body: a 4-row progress list
 *   1. Screenshot
 *   2. Theme
 *   3. Modules
 *   4. Assets mirrored: N/M
 *
 * Plus a "What couldn't mirror" sub-section that appends one row per Stage 4
 * failure, naming the URL and reason — this is the AC8 gap surface.
 *
 * The renderer also exposes `applyTranscribeEvent(card, event)` so the
 * SSE driver can dispatch incoming events to the active card without
 * re-importing dispatcher internals.
 */

import { createChatCard, type ChatCardHandle } from "./chat-card.js";
import {
  registerToolResultRenderer,
  type ToolResultRenderer,
  type ToolResultRendererContext,
} from "./tool-result-renderers.js";

export interface TranscribeProgressPayload {
  readonly kind: "transcribe_site_done";
  readonly url?: string;
  readonly fellBackToHero?: boolean;
  readonly assetMirrorSummary?: {
    readonly mirrored?: number;
    readonly failed?: number;
    readonly failures?: ReadonlyArray<{ readonly url: string; readonly reason: string }>;
  };
  readonly narrative?: string;
}

/**
 * State held in DOM data-attributes so a sequence of action:notify events
 * can update one card without re-rendering.
 */
export interface TranscribeProgressHandle {
  readonly card: ChatCardHandle;
  /** Mark a stage as completed (stage: 1|2|3|4, total: optional for stage 4). */
  setStageStatus(args: {
    stage: 1 | 2 | 3 | 4;
    status: "started" | "completed" | "failed";
    total?: number;
  }): void;
  /** Stage 4 progress: bump the mirrored counter and (optionally) name the asset. */
  recordAssetMirrored(args: { url: string; r2Key: string }): void;
  /** Stage 4 progress: append a failed-mirror row. */
  recordAssetFailed(args: { url: string; reason: string }): void;
  /** Set the narrative (terminal state). */
  setNarrative(text: string): void;
}

const STAGE_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "Screenshot",
  2: "Theme",
  3: "Modules",
  4: "Assets mirrored",
};

export function createTranscribeProgressCard(
  doc: Document,
  args: { url: string; payload?: TranscribeProgressPayload },
): TranscribeProgressHandle {
  const body = doc.createElement("div");
  body.className = "fc-transcribe-progress";
  body.setAttribute("data-fc-transcribe-progress", "");
  body.setAttribute("data-fc-transcribe-url", args.url);

  const list = doc.createElement("ol");
  list.className = "fc-transcribe-progress__stages";
  list.setAttribute("data-fc-transcribe-stages", "");
  for (const stage of [1, 2, 3, 4] as const) {
    const li = doc.createElement("li");
    li.className = "fc-transcribe-progress__stage";
    li.setAttribute("data-fc-transcribe-stage", String(stage));
    li.setAttribute("data-fc-transcribe-stage-status", "pending");
    const label = doc.createElement("span");
    label.className = "fc-transcribe-progress__stage-label";
    label.textContent = STAGE_LABELS[stage];
    const count = doc.createElement("span");
    count.className = "fc-transcribe-progress__stage-count";
    count.setAttribute("data-fc-transcribe-stage-count", "");
    li.appendChild(label);
    li.appendChild(count);
    list.appendChild(li);
  }
  body.appendChild(list);

  const failures = doc.createElement("section");
  failures.className = "fc-transcribe-progress__failures";
  failures.setAttribute("data-fc-transcribe-failures", "");
  failures.style.display = "none";
  const failuresHeader = doc.createElement("h4");
  failuresHeader.textContent = "What couldn't mirror";
  failures.appendChild(failuresHeader);
  const failuresList = doc.createElement("ul");
  failuresList.setAttribute("data-fc-transcribe-failures-list", "");
  failures.appendChild(failuresList);
  body.appendChild(failures);

  const narrative = doc.createElement("p");
  narrative.className = "fc-transcribe-progress__narrative";
  narrative.setAttribute("data-fc-transcribe-narrative", "");
  body.appendChild(narrative);

  const card = createChatCard(doc, {
    title: `Converting ${args.url}`,
    tone: "info",
    icon: "→",
    body,
  });

  let mirroredCount = 0;
  let stage4Total = 0;
  let failedCount = 0;

  const renderStage4Count = (): void => {
    const li = list.querySelector(
      '[data-fc-transcribe-stage="4"]',
    ) as HTMLElement;
    const count = li.querySelector(
      "[data-fc-transcribe-stage-count]",
    ) as HTMLElement;
    if (stage4Total > 0) {
      count.textContent = ` ${mirroredCount}/${stage4Total}${failedCount > 0 ? ` (${failedCount} failed)` : ""}`;
    } else if (mirroredCount > 0 || failedCount > 0) {
      count.textContent = ` ${mirroredCount}${failedCount > 0 ? ` (${failedCount} failed)` : ""}`;
    } else {
      count.textContent = "";
    }
  };

  const handle: TranscribeProgressHandle = {
    card,
    setStageStatus(args2): void {
      const li = list.querySelector(
        `[data-fc-transcribe-stage="${args2.stage}"]`,
      ) as HTMLElement | null;
      if (!li) return;
      li.setAttribute("data-fc-transcribe-stage-status", args2.status);
      if (args2.stage === 4 && args2.status === "started" && args2.total !== undefined) {
        stage4Total = args2.total;
        renderStage4Count();
      }
    },
    recordAssetMirrored(args2): void {
      mirroredCount++;
      renderStage4Count();
      const li = list.querySelector(
        '[data-fc-transcribe-stage="4"]',
      ) as HTMLElement;
      li.setAttribute(
        "data-fc-transcribe-mirrored",
        String(mirroredCount),
      );
      // Keep a hidden trail of the rewritten URL → r2Key for tests.
      li.setAttribute(`data-fc-transcribe-asset-${mirroredCount}`, args2.r2Key);
    },
    recordAssetFailed(args2): void {
      failedCount++;
      renderStage4Count();
      failures.style.display = "";
      const li = doc.createElement("li");
      li.setAttribute("data-fc-transcribe-failure-url", args2.url);
      li.setAttribute("data-fc-transcribe-failure-reason", args2.reason);
      li.textContent = `${args2.url} — ${args2.reason}`;
      failuresList.appendChild(li);
    },
    setNarrative(text): void {
      narrative.textContent = text;
    },
  };

  // Apply any payload already attached (sync-render case where the
  // tool_result was buffered before the SSE events streamed).
  if (args.payload) {
    if (typeof args.payload.narrative === "string") {
      handle.setNarrative(args.payload.narrative);
    }
    const summary = args.payload.assetMirrorSummary;
    if (summary) {
      for (let i = 0; i < (summary.mirrored ?? 0); i++) {
        handle.recordAssetMirrored({ url: "", r2Key: "" });
      }
      if (summary.failures) {
        for (const f of summary.failures) {
          handle.recordAssetFailed({ url: f.url, reason: f.reason });
        }
      }
      // Mark every stage as completed in the terminal state.
      for (const stage of [1, 2, 3, 4] as const) {
        handle.setStageStatus({ stage, status: "completed" });
      }
    }
  }

  return handle;
}

export const createTranscribeProgressRenderer: ToolResultRenderer = (
  ctx: ToolResultRendererContext,
): Node => {
  const { doc, result } = ctx;
  if (!result.ok) {
    return createChatCard(doc, {
      title: "Convert site — failed",
      tone: "danger",
      icon: "!",
      body: "transcribe_site returned an error",
    }).root;
  }
  const data = result.applied.data as TranscribeProgressPayload | undefined;
  const url =
    typeof (result.applied.args as { digestId?: string }).digestId === "string"
      ? (result.applied.args as { digestId: string }).digestId
      : (data?.url ?? "site");
  const handle = createTranscribeProgressCard(doc, { url, payload: data });
  return handle.card.root;
};

/**
 * Dispatch an action:notify event payload into a TranscribeProgressHandle.
 * Used by the chat driver to wire SSE updates to the active progress card.
 *
 * Returns true if the event matched a known stage shape, false otherwise.
 */
export function applyTranscribeEvent(
  handle: TranscribeProgressHandle,
  data: Record<string, unknown>,
): boolean {
  if (data.tool !== "transcribe_site") return false;
  const stage = data.stage;
  const status = data.status;
  if (typeof stage !== "number" || typeof status !== "string") return false;
  if (stage === 4 && status === "asset_mirrored") {
    handle.recordAssetMirrored({
      url: typeof data.url === "string" ? data.url : "",
      r2Key: typeof data.r2Key === "string" ? data.r2Key : "",
    });
    return true;
  }
  if (stage === 4 && status === "asset_failed") {
    handle.recordAssetFailed({
      url: typeof data.url === "string" ? data.url : "",
      reason: typeof data.reason === "string" ? data.reason : "unknown",
    });
    return true;
  }
  if (stage === 1 || stage === 2 || stage === 3 || stage === 4) {
    if (
      status === "started" ||
      status === "completed" ||
      status === "failed"
    ) {
      handle.setStageStatus({
        stage,
        status,
        total: typeof data.total === "number" ? data.total : undefined,
      });
      return true;
    }
  }
  return false;
}

export function registerTranscribeProgress(): void {
  registerToolResultRenderer(
    "transcribe_site_done",
    createTranscribeProgressRenderer,
  );
}
