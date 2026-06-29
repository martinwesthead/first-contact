// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BuilderStore, createChatPanel } from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILDER_HTML = resolve(HERE, "../apps/control-app/public/builder.html");

/**
 * AC-671 (post REQ-36): the chat input renders as a visible text-entry editor
 * with the round Send button sitting at the right edge of the editor capsule
 * (absolute-positioned inside it). The editor is never collapsed and Send
 * never takes over the row. The shipped stylesheet defines .fc-chat__editor /
 * .fc-chat__editor-content and no longer references the removed
 * .fc-chat__textarea selector.
 */
describe("UAT AC-671: builder chat input editor renders visibly with Send positioned to its right", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("test_UAT_AC671_chat_input_visible_with_send_to_right", () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    const onSend = vi.fn(async (_text: string) => {});
    const panel = createChatPanel(document.body, { store, onSend });

    // The editor element exists at the AC's documented selector and mounts a
    // real text-entry content surface (never collapsed to an empty wrapper).
    const editor = document.body.querySelector<HTMLElement>("[data-fc-chat-input]");
    expect(editor, "[data-fc-chat-input] editor must render").not.toBeNull();
    expect(
      editor!.querySelector('[data-fc-chat-editor="content"]'),
      "editor must mount a content surface, not an empty wrapper",
    ).not.toBeNull();

    // The Send button exists, is a compact <button>, and lives inside the
    // editor capsule (so it renders at the editor's right edge, not as a
    // row-filling sibling that takes the input's place).
    const send = document.body.querySelector<HTMLButtonElement>("[data-fc-chat-send]");
    expect(send, "[data-fc-chat-send] button must render").not.toBeNull();
    expect(send!.tagName).toBe("BUTTON");
    expect(editor!.contains(send!)).toBe(true);

    panel.destroy();

    // --- CSS contract: builder.html ships the editor rules ----------------
    const css = readFileSync(BUILDER_HTML, "utf8");

    // .fc-chat__editor and .fc-chat__editor-content rules exist (the editor is
    // a visible, sized field) and the dead .fc-chat__textarea selector is gone.
    expect(extractRule(css, ".fc-chat__editor"), ".fc-chat__editor rule").not.toBeNull();
    const contentRule = extractRule(css, ".fc-chat__editor-content");
    expect(contentRule, ".fc-chat__editor-content rule").not.toBeNull();
    expect(contentRule).toMatch(/min-height\s*:/);
    expect(extractRule(css, ".fc-chat__textarea")).toBeNull();
    expect(css).not.toContain(".fc-chat__textarea");

    // Send is absolutely positioned inside the capsule and pinned to the right
    // edge (so it renders to the right of the editor, not as a row sibling).
    expect(css).toMatch(
      /\.fc-chat__send\s*,\s*\.fc-chat__stop\s*\{[^}]*position\s*:\s*absolute/,
    );
    expect(css).toMatch(
      /\.fc-chat__send\s*,\s*\.fc-chat__stop\s*\{[^}]*right\s*:/,
    );
  });
});

function extractRule(css: string, selector: string): string | null {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`);
  const match = css.match(pattern);
  return match ? match[1]! : null;
}
