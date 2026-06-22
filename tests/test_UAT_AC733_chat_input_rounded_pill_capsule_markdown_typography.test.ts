// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { BuilderStore, createChatPanel } from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILDER_HTML = resolve(HERE, "../apps/control-app/public/builder.html");

/**
 * AC-733: the chat input is a single rounded-pill capsule matching the XGD
 * chat widget — 13px typography, a border-radius:24px editor with a focus
 * accent and a bounded growing height, markdown-typography rules so pasted
 * markdown renders formatted, and a placeholder hint advertising the
 * Enter-to-send contract. The round Send/Stop button sits inside the capsule.
 */
describe("UAT AC-733: chat input is a rounded-pill 13px capsule with markdown typography and an Enter-to-send placeholder", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("test_UAT_AC733_rounded_pill_capsule_markdown_typography_placeholder", () => {
    // The editor renders as a present, non-collapsed content surface.
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    const panel = createChatPanel(document.body, { store, onSend: async () => {} });
    const editor = document.body.querySelector("[data-fc-chat-input]");
    expect(editor, "[data-fc-chat-input] editor must render").not.toBeNull();
    expect(editor!.querySelector('[data-fc-chat-editor="content"]')).not.toBeNull();

    // An empty editor shows the placeholder hint mentioning "Enter to send".
    const placeholderHost = editor!.querySelector("[data-placeholder]");
    expect(
      placeholderHost?.getAttribute("data-placeholder") ?? "",
    ).toContain("Enter to send");

    panel.destroy();

    // --- CSS contract: the shipped builder.html stylesheet -----------------
    const css = readFileSync(BUILDER_HTML, "utf8");

    // 13px typography on the chat region.
    const chatRule = extractRule(css, ".fc-chat");
    expect(chatRule, ".fc-chat rule must exist").not.toBeNull();
    expect(chatRule).toMatch(/font-size\s*:\s*13px/);

    // The editor is a rounded-pill capsule with a focus accent.
    const editorRule = extractRule(css, ".fc-chat__editor");
    expect(editorRule, ".fc-chat__editor rule must exist").not.toBeNull();
    const radius = editorRule!.match(/border-radius\s*:\s*(\d+)px/);
    expect(radius, "editor border-radius in px").not.toBeNull();
    expect(Number(radius![1])).toBeGreaterThanOrEqual(20);
    expect(css).toMatch(
      /\.fc-chat__editor:focus-within\s*\{[^}]*border-color\s*:\s*#2563eb/,
    );

    // The content surface has a single-line min-height that grows to a bounded
    // max-height (the capsule grows then scrolls).
    const contentRule = extractRule(css, ".fc-chat__editor-content");
    expect(contentRule, ".fc-chat__editor-content rule must exist").not.toBeNull();
    expect(contentRule).toMatch(/min-height\s*:/);
    expect(contentRule).toMatch(/max-height\s*:/);

    // Markdown typography rules on the editor content (headings/lists/pre/code/table).
    expect(css).toMatch(/\.fc-chat__editor-content\s+h1\s*,/);
    expect(css).toMatch(/\.fc-chat__editor-content\s+ul\s*,/);
    expect(css).toMatch(/\.fc-chat__editor-content\s+pre\s*\{/);
    expect(css).toMatch(/\.fc-chat__editor-content\s+code\s*\{/);
    expect(css).toMatch(/\.fc-chat__editor-content\s+table\s*\{/);

    // The round Send button sits inside the capsule (absolute-positioned).
    expect(css).toMatch(
      /\.fc-chat__send\s*,\s*\.fc-chat__stop\s*\{[^}]*position\s*:\s*absolute/,
    );
  });
});

function extractRule(css: string, selector: string): string | null {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`);
  const match = css.match(pattern);
  return match ? match[1]! : null;
}
