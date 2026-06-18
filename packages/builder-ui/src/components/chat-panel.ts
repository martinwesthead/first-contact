import DOMPurify from "dompurify";
import { marked } from "marked";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import type { BuilderStore, ChatMessage, ChatToolCallRecord } from "../store.js";
import { renderToolResult } from "./tool-result-renderers.js";

export interface ChatPanelHandle {
  readonly root: HTMLElement;
  readonly messageList: HTMLElement;
  readonly editorRoot: HTMLElement;
  readonly sendButton: HTMLButtonElement;
  /** Read the current editor content as markdown. */
  getInputMarkdown(): string;
  /** Replace the editor content. Accepts plain markdown. */
  setInputMarkdown(md: string): void;
  destroy(): void;
}

export interface ChatPanelOptions {
  store: BuilderStore;
  onSend: (text: string) => void | Promise<void>;
}

// Marked is configured once at module scope. GFM extensions are on by default
// in v14+; we add a link renderer that opens external links in new tabs with
// the noopener/noreferrer guard.
marked.use({
  gfm: true,
  breaks: false,
  renderer: {
    link({ href, title, tokens }): string {
      const text = this.parser.parseInline(tokens);
      const safeHref = typeof href === "string" ? href : "";
      const titleAttr = title ? ` title="${escapeAttr(title)}"` : "";
      return `<a href="${escapeAttr(safeHref)}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
    },
  },
});

export function renderMarkdownToDom(
  doc: Document,
  markdown: string,
): Node {
  if (!markdown) return doc.createTextNode("");
  const rawHtml = marked.parse(markdown, { async: false }) as string;
  const safeHtml = DOMPurify.sanitize(rawHtml, {
    ADD_ATTR: ["target", "rel"],
  });
  const container = doc.createElement("div");
  container.className = "fc-chat-markdown";
  container.setAttribute("data-fc-chat-markdown", "");
  container.innerHTML = safeHtml;
  return container;
}

export function createChatPanel(
  parent: HTMLElement,
  options: ChatPanelOptions,
): ChatPanelHandle {
  const doc = parent.ownerDocument;
  const root = doc.createElement("div");
  root.className = "fc-chat";
  root.setAttribute("data-fc-chat", "");

  const messageList = doc.createElement("div");
  messageList.className = "fc-chat__messages";
  messageList.setAttribute("data-fc-chat-messages", "");

  const inputRow = doc.createElement("div");
  inputRow.className = "fc-chat__input";

  const editorRoot = doc.createElement("div");
  editorRoot.className = "fc-chat__editor";
  editorRoot.setAttribute("data-fc-chat-input", "");
  editorRoot.setAttribute("role", "textbox");

  const sendButton = doc.createElement("button");
  sendButton.type = "button";
  sendButton.className = "fc-chat__send";
  sendButton.setAttribute("data-fc-chat-send", "");
  sendButton.textContent = "Send";

  inputRow.appendChild(editorRoot);
  inputRow.appendChild(sendButton);

  root.appendChild(messageList);
  root.appendChild(inputRow);
  parent.appendChild(root);

  const editor = new Editor({
    element: editorRoot,
    extensions: [
      StarterKit.configure({}),
      Markdown.configure({
        html: false,
        tightLists: true,
        breaks: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "fc-chat__editor-content",
        "data-fc-chat-editor": "content",
        "aria-label": "Tell the builder what to do",
      },
    },
  });

  const getInputMarkdown = (): string => {
    const storage = (editor.storage as Record<string, unknown>).markdown as
      | { getMarkdown?: () => string }
      | undefined;
    if (storage && typeof storage.getMarkdown === "function") {
      return storage.getMarkdown().trim();
    }
    // Fallback (should not happen): strip HTML tags.
    return editor.getText().trim();
  };

  const setInputMarkdown = (md: string): void => {
    editor.commands.setContent(md);
  };

  const renderMessage = (m: ChatMessage): HTMLElement => {
    const node = doc.createElement("div");
    node.className = `fc-chat__message fc-chat__message--${m.role}`;
    node.setAttribute("data-fc-chat-role", m.role);

    const textWrap = doc.createElement("div");
    textWrap.className = "fc-chat__message-text";
    if (m.role === "assistant") {
      textWrap.appendChild(renderMarkdownToDom(doc, m.content));
    } else {
      // User and system messages stay plaintext — what the operator typed
      // (or what the system emitted) is shown verbatim.
      textWrap.textContent = m.content;
    }
    node.appendChild(textWrap);

    if (m.toolCalls) {
      for (const call of m.toolCalls) {
        node.appendChild(renderToolCallSummary(doc, call));
      }
    }
    return node;
  };

  const renderMessages = (history: ReadonlyArray<ChatMessage>): void => {
    messageList.innerHTML = "";
    for (const m of history) {
      messageList.appendChild(renderMessage(m));
    }
    messageList.scrollTop = messageList.scrollHeight;
  };

  renderMessages(options.store.getState().chatHistory);
  const unsubscribe = options.store.subscribe((state) => {
    renderMessages(state.chatHistory);
  });

  const submit = async (): Promise<void> => {
    const text = getInputMarkdown();
    if (!text) return;
    editor.commands.clearContent();
    await options.onSend(text);
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void submit();
    }
  };

  const sendHandler = (): void => void submit();
  sendButton.addEventListener("click", sendHandler);
  editorRoot.addEventListener("keydown", onKeyDown);

  return {
    root,
    messageList,
    editorRoot,
    sendButton,
    getInputMarkdown,
    setInputMarkdown,
    destroy(): void {
      sendButton.removeEventListener("click", sendHandler);
      editorRoot.removeEventListener("keydown", onKeyDown);
      unsubscribe();
      editor.destroy();
      parent.removeChild(root);
    },
  };
}

function renderToolCallSummary(
  doc: Document,
  call: ChatToolCallRecord,
): Node {
  if (call.result) {
    return renderToolResult({
      doc,
      result: call.result,
      renderMarkdown: (md) => renderMarkdownToDom(doc, md),
    });
  }
  // Legacy / unstructured tool call — render the simple accepted/rejected row
  // (preserves REQ-8's behaviour for stubbed test endpoints).
  const row = doc.createElement("div");
  row.className = `fc-chat__tool-call ${
    call.accepted ? "is-accepted" : "is-rejected"
  }`;
  row.setAttribute("data-fc-tool-call", call.name);
  row.setAttribute(
    "data-fc-tool-status",
    call.accepted ? "accepted" : "rejected",
  );
  row.textContent = call.accepted
    ? `✓ ${call.name}`
    : `✗ ${call.name} — ${call.error ?? "rejected"}`;
  return row;
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
