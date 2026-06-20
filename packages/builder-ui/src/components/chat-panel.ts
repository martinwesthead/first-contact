import DOMPurify from "dompurify";
import { marked } from "marked";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import type {
  BuilderStore,
  ChatMessage,
  ChatToolCallRecord,
  PendingToolFailure,
} from "../store.js";
import { renderToolResult } from "./tool-result-renderers.js";

export interface ChatPanelHandle {
  readonly root: HTMLElement;
  readonly messageList: HTMLElement;
  readonly editorRoot: HTMLElement;
  readonly sendButton: HTMLButtonElement;
  readonly stopButton: HTMLButtonElement;
  readonly toolHeader: HTMLElement;
  readonly toolPane: HTMLElement;
  readonly toolPaneBody: HTMLElement;
  /** REQ-37: banner that surfaces tool calls rejected on the prior turn. */
  readonly failurePanel: HTMLElement;
  /** Read the current editor content as markdown. */
  getInputMarkdown(): string;
  /** Replace the editor content. Accepts plain markdown. */
  setInputMarkdown(md: string): void;
  /** Append a tool-use event row to the live tool pane. Returns the row so
   *  the driver can mutate it (e.g. flip rejected ↔ accepted) later. */
  appendToolEvent(detail: ToolEventDetail): HTMLElement;
  /** Reset the tool-pane stream — called at the start of each new turn. */
  clearToolEvents(): void;
  /** Open the tool pane if it is currently collapsed. */
  expandToolPane(): void;
  destroy(): void;
}

export interface ToolEventDetail {
  readonly name: string;
  readonly inputSummary?: string;
  readonly status?: "in_flight" | "accepted" | "rejected";
}

export interface ChatPanelOptions {
  store: BuilderStore;
  onSend: (text: string) => void | Promise<void>;
  /** Optional abort handler called when the operator clicks Stop. */
  onStop?: () => void;
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

  // Tool-use pane (collapsible). Sits above the message list — XGD parity.
  // Hidden by default; clicking the header toggles visible and flips the
  // chevron between ▶ (collapsed) and ▼ (expanded).
  const toolHeader = doc.createElement("div");
  toolHeader.className = "fc-chat__tool-header";
  toolHeader.setAttribute("data-fc-chat-tool-header", "");
  toolHeader.setAttribute("role", "button");
  toolHeader.setAttribute("aria-expanded", "false");
  toolHeader.setAttribute("tabindex", "0");

  const toolChevron = doc.createElement("span");
  toolChevron.className = "fc-chat__tool-chevron";
  toolChevron.setAttribute("data-fc-chat-tool-chevron", "");
  toolChevron.textContent = "▶"; // ▶

  const toolLabel = doc.createElement("span");
  toolLabel.className = "fc-chat__tool-header-label";
  toolLabel.textContent = "Tool use";

  toolHeader.appendChild(toolChevron);
  toolHeader.appendChild(toolLabel);

  const toolPane = doc.createElement("div");
  toolPane.className = "fc-chat__tool-pane";
  toolPane.setAttribute("data-fc-chat-tool-pane", "");
  toolPane.hidden = true;

  const toolPaneBody = doc.createElement("div");
  toolPaneBody.className = "fc-chat__tool-pane-body";
  toolPaneBody.setAttribute("data-fc-chat-tool-pane-body", "");
  toolPane.appendChild(toolPaneBody);

  // REQ-37: dismissable banner that surfaces tool calls the previous turn
  // rejected. Hidden when there are no pending failures. Operator-visible
  // copy of what the next outbound turn's system note will tell the AI.
  const failurePanel = doc.createElement("div");
  failurePanel.className = "fc-chat__failure-panel";
  failurePanel.setAttribute("data-fc-chat-failure-panel", "");
  failurePanel.hidden = true;

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
  sendButton.setAttribute("aria-label", "Send");
  sendButton.setAttribute("title", "Send (Enter)");
  sendButton.textContent = "▶"; // ▶ play glyph

  const stopButton = doc.createElement("button");
  stopButton.type = "button";
  stopButton.className = "fc-chat__stop";
  stopButton.setAttribute("data-fc-chat-stop", "");
  stopButton.setAttribute("aria-label", "Stop");
  stopButton.setAttribute("title", "Stop");
  stopButton.textContent = "■"; // ■ stop glyph

  // Send & Stop are absolute-positioned inside the editor wrapper — see CSS.
  editorRoot.appendChild(sendButton);
  editorRoot.appendChild(stopButton);
  inputRow.appendChild(editorRoot);

  root.appendChild(toolHeader);
  root.appendChild(toolPane);
  root.appendChild(failurePanel);
  root.appendChild(messageList);
  root.appendChild(inputRow);
  parent.appendChild(root);

  // TipTap mount. handleKeyDown is the key hook for G8 (Enter sends, modifier
  // falls through to TipTap's default newline behaviour).
  const editor = new Editor({
    element: editorRoot,
    extensions: [
      StarterKit.configure({}),
      Placeholder.configure({
        placeholder: "Type a message... (Enter to send, Shift+Enter for newline)",
      }),
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
      handleKeyDown: (_view, event): boolean => {
        if (event.key !== "Enter") return false;
        // Modifier+Enter → newline (TipTap default).
        if (event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) {
          return false;
        }
        event.preventDefault();
        if (busy) return true;
        runSubmit();
        return true;
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
    // REQ-36 G5: both user and assistant messages render through the
    // markdown pipeline so `**bold**`, headings, lists, code etc. all
    // render formatted. System messages stay plaintext — they're sentinel
    // strings emitted by the driver, not operator/AI prose.
    if (m.role === "assistant" || m.role === "user") {
      textWrap.appendChild(renderMarkdownToDom(doc, m.content));
    } else {
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

  const renderFailurePanel = (
    failures: ReadonlyArray<PendingToolFailure>,
  ): void => {
    failurePanel.innerHTML = "";
    if (failures.length === 0) {
      failurePanel.hidden = true;
      return;
    }
    failurePanel.hidden = false;
    const header = doc.createElement("div");
    header.className = "fc-chat__failure-panel-header";
    const title = doc.createElement("span");
    title.className = "fc-chat__failure-panel-title";
    title.textContent =
      failures.length === 1
        ? "1 tool call failed last turn"
        : `${failures.length} tool calls failed last turn`;
    header.appendChild(title);

    const dismiss = doc.createElement("button");
    dismiss.type = "button";
    dismiss.className = "fc-chat__failure-panel-dismiss";
    dismiss.setAttribute("data-fc-chat-failure-dismiss", "");
    dismiss.setAttribute("aria-label", "Dismiss failures");
    dismiss.textContent = "Dismiss";
    dismiss.addEventListener("click", () => options.store.clearToolFailures());
    header.appendChild(dismiss);
    failurePanel.appendChild(header);

    const list = doc.createElement("ul");
    list.className = "fc-chat__failure-panel-list";
    for (const f of failures) {
      const item = doc.createElement("li");
      item.className = "fc-chat__failure-panel-item";
      item.setAttribute("data-fc-chat-failure-tool", f.name);
      const name = doc.createElement("span");
      name.className = "fc-chat__failure-panel-tool";
      name.textContent = f.name;
      const sep = doc.createTextNode(" — ");
      const err = doc.createElement("span");
      err.className = "fc-chat__failure-panel-error";
      err.textContent = f.error;
      item.appendChild(name);
      item.appendChild(sep);
      item.appendChild(err);
      list.appendChild(item);
    }
    failurePanel.appendChild(list);
  };

  renderMessages(options.store.getState().chatHistory);
  renderFailurePanel(options.store.getState().pendingToolFailures);
  const unsubscribe = options.store.subscribe((state) => {
    renderMessages(state.chatHistory);
    renderFailurePanel(state.pendingToolFailures);
  });

  // Tool-pane toggle: chevron flips ▶ ↔ ▼.
  let toolPaneExpanded = false;
  const applyToolPaneState = (): void => {
    if (toolPaneExpanded) {
      toolPane.hidden = false;
      toolChevron.textContent = "▼"; // ▼
      toolHeader.setAttribute("aria-expanded", "true");
    } else {
      toolPane.hidden = true;
      toolChevron.textContent = "▶"; // ▶
      toolHeader.setAttribute("aria-expanded", "false");
    }
  };
  const toggleToolPane = (): void => {
    toolPaneExpanded = !toolPaneExpanded;
    applyToolPaneState();
  };
  const expandToolPane = (): void => {
    if (toolPaneExpanded) return;
    toolPaneExpanded = true;
    applyToolPaneState();
  };
  toolHeader.addEventListener("click", toggleToolPane);
  toolHeader.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleToolPane();
    }
  });

  const appendToolEvent = (detail: ToolEventDetail): HTMLElement => {
    const row = doc.createElement("div");
    row.className = "fc-chat__tool-event";
    row.setAttribute("data-fc-chat-tool-event", detail.name);
    row.setAttribute("data-status", detail.status ?? "in_flight");
    const header = doc.createElement("div");
    header.className = "fc-chat__tool-event-header";
    const nameSpan = doc.createElement("span");
    nameSpan.className = "fc-chat__tool-event-name";
    nameSpan.textContent = detail.name;
    header.appendChild(nameSpan);
    if (detail.inputSummary) {
      const sep = doc.createTextNode(" ");
      const arg = doc.createElement("span");
      arg.className = "fc-chat__tool-event-arg";
      arg.textContent = detail.inputSummary;
      header.appendChild(sep);
      header.appendChild(arg);
    }
    row.appendChild(header);
    toolPaneBody.appendChild(row);
    toolPaneBody.scrollTop = toolPaneBody.scrollHeight;
    return row;
  };

  const clearToolEvents = (): void => {
    toolPaneBody.innerHTML = "";
  };

  let busy = false;
  const setBusy = (next: boolean): void => {
    busy = next;
    sendButton.disabled = next;
    if (next) {
      sendButton.setAttribute("aria-busy", "true");
      sendButton.setAttribute("data-fc-chat-send-busy", "");
      stopButton.setAttribute("data-fc-chat-stop-visible", "");
    } else {
      sendButton.removeAttribute("aria-busy");
      sendButton.removeAttribute("data-fc-chat-send-busy");
      stopButton.removeAttribute("data-fc-chat-stop-visible");
    }
  };

  const submit = async (): Promise<void> => {
    if (busy) return;
    const text = getInputMarkdown();
    if (!text) return;
    editor.commands.clearContent();
    setBusy(true);
    try {
      await options.onSend(text);
    } finally {
      setBusy(false);
    }
  };

  const runSubmit = (): void => {
    submit().catch(() => {
      // Errors from onSend are surfaced via the store / chat-driver; the
      // busy state has already been cleared in submit()'s finally. Swallow
      // here so a rejected onSend does not become an unhandled promise
      // rejection on the page.
    });
  };

  const onStopClick = (): void => {
    if (options.onStop) options.onStop();
  };

  sendButton.addEventListener("click", () => runSubmit());
  stopButton.addEventListener("click", onStopClick);

  return {
    root,
    messageList,
    editorRoot,
    sendButton,
    stopButton,
    toolHeader,
    toolPane,
    toolPaneBody,
    failurePanel,
    getInputMarkdown,
    setInputMarkdown,
    appendToolEvent,
    clearToolEvents,
    expandToolPane,
    destroy(): void {
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
