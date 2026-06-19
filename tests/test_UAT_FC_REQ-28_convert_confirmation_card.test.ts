// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearToolResultRenderers,
  registerConvertConfirmation,
  renderMarkdownToDom,
  renderToolResult,
  type ChatToolResultRecord,
} from "@1stcontact/builder-ui";

function makeConfirmationResult(): ChatToolResultRecord {
  return {
    ok: true,
    applied: {
      tool: "transcribe_site",
      args: { digestId: "https://acme.test/" },
      summary: "Convert requires confirmation",
      kind: "convert_confirmation",
      data: {
        kind: "convert_confirmation",
        url: "https://acme.test/",
        prompt:
          "Convert will replace your current draft with a transcription of https://acme.test/. This cannot be automatically undone. Continue?",
      },
    },
  };
}

describe("UAT FC REQ-28: <ConvertConfirmation> chat-card variant (AC1, AC2, AC14)", () => {
  beforeEach(() => {
    clearToolResultRenderers();
    registerConvertConfirmation();
  });
  afterEach(() => {
    clearToolResultRenderers();
    document.body.innerHTML = "";
  });

  it("AC1: dispatcher routes kind='convert_confirmation' to the warning-toned card with prompt + checkbox", () => {
    const node = renderToolResult({
      doc: document,
      result: makeConfirmationResult(),
      renderMarkdown: (md) => renderMarkdownToDom(document, md),
    }) as HTMLElement;

    expect(node.getAttribute("data-fc-chat-card-tone")).toBe("warning");
    const titleEl = node.querySelector("[data-fc-chat-card-title]")!;
    expect(titleEl.textContent).toBe("Convert site");

    const body = node.querySelector("[data-fc-convert-confirmation]") as HTMLElement;
    expect(body).not.toBeNull();
    expect(body.getAttribute("data-fc-convert-url")).toBe("https://acme.test/");

    const prompt = node.querySelector("[data-fc-convert-prompt]");
    expect(prompt!.textContent).toMatch(/Convert will replace your current draft/);
    expect(prompt!.textContent).toMatch(/cannot be automatically undone/);

    const checkbox = node.querySelector(
      "[data-fc-convert-owns-checkbox]",
    ) as HTMLInputElement;
    expect(checkbox).not.toBeNull();
    expect(checkbox.checked).toBe(false);

    // Two action buttons.
    const confirm = node.querySelector('[data-fc-chat-card-action="Confirm"]');
    const cancel = node.querySelector('[data-fc-chat-card-action="Cancel"]');
    expect(confirm).not.toBeNull();
    expect(cancel).not.toBeNull();
  });

  it("AC2: clicking Confirm dispatches fc:convert-confirmed with url + ownsSite=false by default", () => {
    const node = renderToolResult({
      doc: document,
      result: makeConfirmationResult(),
      renderMarkdown: (md) => renderMarkdownToDom(document, md),
    }) as HTMLElement;
    document.body.appendChild(node);

    let payload: unknown = null;
    document.addEventListener("fc:convert-confirmed", (e) => {
      payload = (e as CustomEvent).detail;
    });
    (node.querySelector(
      '[data-fc-chat-card-action="Confirm"]',
    ) as HTMLButtonElement).click();
    expect(payload).toEqual({
      url: "https://acme.test/",
      ownsSite: false,
    });
  });

  it("AC14: checking 'I own this site' sets ownsSite=true in the Confirm event payload", () => {
    const node = renderToolResult({
      doc: document,
      result: makeConfirmationResult(),
      renderMarkdown: (md) => renderMarkdownToDom(document, md),
    }) as HTMLElement;
    document.body.appendChild(node);

    const checkbox = node.querySelector(
      "[data-fc-convert-owns-checkbox]",
    ) as HTMLInputElement;
    checkbox.checked = true;

    let payload: { url?: string; ownsSite?: boolean } | null = null;
    document.addEventListener("fc:convert-confirmed", (e) => {
      payload = (e as CustomEvent).detail;
    });
    (node.querySelector(
      '[data-fc-chat-card-action="Confirm"]',
    ) as HTMLButtonElement).click();
    expect(payload!.ownsSite).toBe(true);
  });

  it("clicking Cancel dispatches fc:convert-cancelled and collapses the card", () => {
    const node = renderToolResult({
      doc: document,
      result: makeConfirmationResult(),
      renderMarkdown: (md) => renderMarkdownToDom(document, md),
    }) as HTMLElement;
    document.body.appendChild(node);

    let payload: unknown = null;
    document.addEventListener("fc:convert-cancelled", (e) => {
      payload = (e as CustomEvent).detail;
    });
    (node.querySelector(
      '[data-fc-chat-card-action="Cancel"]',
    ) as HTMLButtonElement).click();
    expect(payload).toEqual({ url: "https://acme.test/" });
    expect(node.getAttribute("data-fc-chat-card-collapsed")).toBe("true");
  });
});
