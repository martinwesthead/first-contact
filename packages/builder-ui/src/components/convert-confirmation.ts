/**
 * <ConvertConfirmation> — chat-card variant for the convert-flow destructive
 * confirmation gate (REQ-28 AC1, AC14).
 *
 * Registered with the REQ-13 dispatcher under kind: 'convert_confirmation'.
 * Renders when `transcribe_site` returns {kind: 'convert_confirmation',
 * url, prompt}. The card shows:
 *
 *   - `warning`-toned ChatCard "Convert site"
 *   - Body: the prompt text + a "I own this site" checkbox (toggles the
 *     ownsSite flag the operator can attach to consent — AC14)
 *   - Actions row: Confirm (primary) + Cancel (secondary). Confirm dispatches
 *     a `fc:convert-confirmed` CustomEvent so the chat driver can issue
 *     confirm_convert + re-invoke transcribe_site. Cancel just collapses.
 *
 * The renderer is intentionally lightweight: it does NOT call any APIs
 * directly. The chat driver listens for `fc:convert-confirmed` and wires the
 * follow-up turns.
 */

import { createChatCard } from "./chat-card.js";
import {
  registerToolResultRenderer,
  type ToolResultRenderer,
  type ToolResultRendererContext,
} from "./tool-result-renderers.js";

interface ConvertConfirmationPayload {
  readonly kind: "convert_confirmation";
  readonly url: string;
  readonly prompt: string;
}

export const createConvertConfirmationRenderer: ToolResultRenderer = (
  ctx: ToolResultRendererContext,
): Node => {
  const { doc, result } = ctx;
  if (!result.ok) {
    return createChatCard(doc, {
      title: "Convert site — error",
      tone: "danger",
      icon: "!",
      body: "transcribe_site returned an error",
    }).root;
  }
  const data = result.applied.data as ConvertConfirmationPayload | undefined;
  if (!data || !data.url || !data.prompt) {
    return createChatCard(doc, {
      title: "Convert site — invalid payload",
      tone: "warning",
      icon: "?",
      body: "tool_result is missing { url, prompt } data",
    }).root;
  }

  const body = doc.createElement("div");
  body.className = "fc-convert-confirmation";
  body.setAttribute("data-fc-convert-confirmation", "");
  body.setAttribute("data-fc-convert-url", data.url);

  const promptP = doc.createElement("p");
  promptP.className = "fc-convert-confirmation__prompt";
  promptP.setAttribute("data-fc-convert-prompt", "");
  promptP.textContent = data.prompt;
  body.appendChild(promptP);

  const ownsLabel = doc.createElement("label");
  ownsLabel.className = "fc-convert-confirmation__owns";
  ownsLabel.setAttribute("data-fc-convert-owns-label", "");
  const ownsCheckbox = doc.createElement("input");
  ownsCheckbox.type = "checkbox";
  ownsCheckbox.setAttribute("data-fc-convert-owns-checkbox", "");
  ownsLabel.appendChild(ownsCheckbox);
  const ownsText = doc.createElement("span");
  ownsText.textContent =
    "I own this site (register a robots.txt override for this origin)";
  ownsLabel.appendChild(ownsText);
  body.appendChild(ownsLabel);

  const card = createChatCard(doc, {
    title: "Convert site",
    tone: "warning",
    icon: "⚠",
    body,
    actions: [
      {
        label: "Confirm",
        variant: "primary",
        onClick: (): void => {
          doc.dispatchEvent(
            new CustomEvent("fc:convert-confirmed", {
              detail: { url: data.url, ownsSite: ownsCheckbox.checked },
              bubbles: true,
            }),
          );
          card.setCollapsed(true);
        },
      },
      {
        label: "Cancel",
        variant: "secondary",
        onClick: (): void => {
          doc.dispatchEvent(
            new CustomEvent("fc:convert-cancelled", {
              detail: { url: data.url },
              bubbles: true,
            }),
          );
          card.setCollapsed(true);
        },
      },
    ],
  });
  return card.root;
};

export function registerConvertConfirmation(): void {
  registerToolResultRenderer(
    "convert_confirmation",
    createConvertConfirmationRenderer,
  );
}
