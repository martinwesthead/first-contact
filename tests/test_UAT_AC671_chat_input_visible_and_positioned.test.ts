// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BuilderStore, createChatPanel } from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILDER_HTML = resolve(HERE, "../apps/control-app/public/builder.html");

describe("UAT AC-671: builder chat input editor renders visibly with Send positioned to its right", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("test_UAT_AC671_chat_input_visible_and_positioned", () => {
    // --- DOM boundary: render the real chat panel component ---------------
    // REQ-13 swapped the chat input from <textarea> to a TipTap editor mounted
    // into <div class=fc-chat__editor data-fc-chat-input>. BUG-1 restored the
    // CSS so the editor renders as a visible field with Send to its right.
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    const onSend = vi.fn(async (_text: string) => {});
    const panel = createChatPanel(document.body, { store, onSend });

    // The editor element exists at the AC's documented selector and is a real
    // text-entry surface (TipTap mounts .fc-chat__editor-content inside it),
    // never collapsed to an empty wrapper.
    const editor = document.body.querySelector<HTMLElement>(
      "[data-fc-chat-input]",
    );
    expect(editor, "[data-fc-chat-input] editor must render").not.toBeNull();
    expect(
      editor!.querySelector('[data-fc-chat-editor="content"]'),
      "editor must mount a content surface, not an empty wrapper",
    ).not.toBeNull();

    // The Send button exists, stays a compact <button> (it does not take over
    // the row in place of the input), and labels itself "Send".
    const send = document.body.querySelector<HTMLButtonElement>(
      "[data-fc-chat-send]",
    );
    expect(send, "[data-fc-chat-send] button must render").not.toBeNull();
    expect(send!.tagName).toBe("BUTTON");
    expect(send!.textContent).toBe("Send");

    // Both live in the same .fc-chat__input row and the editor comes BEFORE the
    // send button in document order — i.e. the visual layout is [ editor ][ Send ].
    const inputRow = editor!.closest(".fc-chat__input");
    expect(inputRow, "editor and send share the .fc-chat__input row").not.toBeNull();
    expect(inputRow!.contains(send!)).toBe(true);
    const editorFollowedBySend =
      editor!.compareDocumentPosition(send!) &
      Node.DOCUMENT_POSITION_FOLLOWING;
    expect(
      Boolean(editorFollowedBySend),
      "Send must sit to the right of the editor (editor precedes Send)",
    ).toBe(true);

    panel.destroy();

    // --- CSS contract: builder.html ships the rules that give the editor -----
    // --- non-zero rendered size and keep Send compact on the right ----------
    const css = readFileSync(BUILDER_HTML, "utf8");

    // .fc-chat__editor grows to fill the row → non-zero rendered width.
    const editorRule = extractRule(css, ".fc-chat__editor");
    expect(editorRule, ".fc-chat__editor rule must exist").not.toBeNull();
    expect(editorRule).toMatch(/flex\s*:\s*1\s+1\s+auto/);

    // .fc-chat__editor-content has min-height + padding → non-zero rendered
    // height and a visible, non-collapsed field.
    const contentRule = extractRule(css, ".fc-chat__editor-content");
    expect(contentRule, ".fc-chat__editor-content rule must exist").not.toBeNull();
    expect(contentRule).toMatch(/min-height\s*:/);
    expect(contentRule).toMatch(/padding\s*:/);

    // The dead .fc-chat__textarea selector is gone (the element no longer exists).
    expect(extractRule(css, ".fc-chat__textarea")).toBeNull();

    // .fc-chat__input is a row-direction flex container (not row-reverse), so the
    // [editor][Send] DOM order renders left-to-right and Send stays on the right.
    const inputRule = extractRule(css, ".fc-chat__input");
    expect(inputRule, ".fc-chat__input rule must exist").not.toBeNull();
    expect(inputRule).toMatch(/display\s*:\s*flex/);
    expect(inputRule).not.toMatch(/flex-direction\s*:\s*row-reverse/);
  });
});

/**
 * Extract the body of the first CSS rule whose selector exactly matches
 * `selector` (no descendant / pseudo variants). Returns null if absent.
 */
function extractRule(css: string, selector: string): string | null {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`);
  const match = css.match(pattern);
  return match ? match[1]! : null;
}
