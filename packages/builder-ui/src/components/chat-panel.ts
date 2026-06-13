import type { BuilderStore, ChatMessage } from "../store.js";

export interface ChatPanelHandle {
  readonly root: HTMLElement;
  readonly messageList: HTMLElement;
  readonly textInput: HTMLTextAreaElement;
  readonly sendButton: HTMLButtonElement;
  destroy(): void;
}

export interface ChatPanelOptions {
  store: BuilderStore;
  onSend: (text: string) => void | Promise<void>;
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

  const textInput = doc.createElement("textarea");
  textInput.className = "fc-chat__textarea";
  textInput.setAttribute("data-fc-chat-input", "");
  textInput.setAttribute("placeholder", "Tell the builder what to do…");
  textInput.rows = 2;

  const sendButton = doc.createElement("button");
  sendButton.type = "button";
  sendButton.className = "fc-chat__send";
  sendButton.setAttribute("data-fc-chat-send", "");
  sendButton.textContent = "Send";

  inputRow.appendChild(textInput);
  inputRow.appendChild(sendButton);

  root.appendChild(messageList);
  root.appendChild(inputRow);
  parent.appendChild(root);

  const renderMessages = (history: ReadonlyArray<ChatMessage>): void => {
    messageList.innerHTML = "";
    for (const m of history) {
      const node = doc.createElement("div");
      node.className = `fc-chat__message fc-chat__message--${m.role}`;
      node.setAttribute("data-fc-chat-role", m.role);
      node.textContent = m.content;
      if (m.toolCalls) {
        for (const c of m.toolCalls) {
          const tcRow = doc.createElement("div");
          tcRow.className = `fc-chat__tool-call ${
            c.accepted ? "is-accepted" : "is-rejected"
          }`;
          tcRow.setAttribute("data-fc-tool-call", c.name);
          tcRow.setAttribute(
            "data-fc-tool-status",
            c.accepted ? "accepted" : "rejected",
          );
          tcRow.textContent = c.accepted
            ? `✓ ${c.name}`
            : `✗ ${c.name} — ${c.error ?? "rejected"}`;
          node.appendChild(tcRow);
        }
      }
      messageList.appendChild(node);
    }
    messageList.scrollTop = messageList.scrollHeight;
  };

  renderMessages(options.store.getState().chatHistory);
  const unsubscribe = options.store.subscribe((state) => {
    renderMessages(state.chatHistory);
  });

  const onSend = async (): Promise<void> => {
    const text = textInput.value.trim();
    if (!text) return;
    textInput.value = "";
    await options.onSend(text);
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void onSend();
    }
  };
  sendButton.addEventListener("click", () => void onSend());
  textInput.addEventListener("keydown", onKeyDown);

  return {
    root,
    messageList,
    textInput,
    sendButton,
    destroy() {
      sendButton.removeEventListener("click", () => void onSend());
      textInput.removeEventListener("keydown", onKeyDown);
      unsubscribe();
      parent.removeChild(root);
    },
  };
}
