/**
 * tool_result → renderer dispatcher (REQ-13 §Part 3).
 *
 * The chat panel calls `renderToolResult` for each tool call carrying a
 * server-provided result. When `result.applied.kind` matches a registered
 * renderer, that renderer is invoked. Unknown kinds (or the absence of a
 * `kind`) fall back to a markdown rendering of the summary.
 *
 * Downstream REQs ([[REQ-21]], [[REQ-28]]) register their per-kind
 * components by calling `registerToolResultRenderer(kind, fn)`. This REQ
 * ships the dispatcher, the fallback, and a stub renderer used by the
 * dispatcher unit test.
 */

import type { ChatToolResultRecord } from "../store.js";
import { createChatCard, type ChatCardHandle } from "./chat-card.js";

export interface ToolResultRendererContext {
  readonly doc: Document;
  readonly result: ChatToolResultRecord;
  /**
   * Plain markdown → DOMPurified HTML. Provided so renderers don't each
   * import marked/DOMPurify separately. Returns a text node when the
   * markdown is empty.
   */
  readonly renderMarkdown: (md: string) => Node;
}

export type ToolResultRenderer = (ctx: ToolResultRendererContext) => Node;

const RENDERERS = new Map<string, ToolResultRenderer>();

export function registerToolResultRenderer(
  kind: string,
  renderer: ToolResultRenderer,
): void {
  RENDERERS.set(kind, renderer);
}

export function getRegisteredToolResultRenderer(
  kind: string,
): ToolResultRenderer | undefined {
  return RENDERERS.get(kind);
}

export function clearToolResultRenderers(): void {
  RENDERERS.clear();
}

/**
 * Dispatch a tool_result to its renderer. The returned node is appended to
 * the chat message DOM by the chat panel.
 *
 * Dispatch rules:
 *   1. If result is a failure → render a danger-toned ChatCard with the
 *      validation message.
 *   2. If `applied.kind` is registered → call the registered renderer.
 *   3. Otherwise → render the summary as markdown inside a neutral card.
 */
export function renderToolResult(
  ctx: ToolResultRendererContext,
): Node {
  const { result, doc, renderMarkdown } = ctx;

  if (!result.ok) {
    const card = createChatCard(doc, {
      title: `${result.error.tool} — rejected`,
      tone: "danger",
      icon: "✗",
    });
    const validation = result.error.validation as
      | { message?: unknown }
      | undefined;
    const msg =
      validation && typeof validation.message === "string"
        ? validation.message
        : JSON.stringify(validation);
    card.setBody(msg);
    return card.root;
  }

  const kind = result.applied.kind;
  if (kind) {
    const renderer = RENDERERS.get(kind);
    if (renderer) return renderer(ctx);
  }

  // Fallback: markdown card with the summary.
  const card: ChatCardHandle = createChatCard(doc, {
    title: `${result.applied.tool}`,
    tone: "success",
    icon: "✓",
  });
  card.setBody(renderMarkdown(result.applied.summary));
  return card.root;
}
