/**
 * Vanilla DOM primitive used by every structured tool_result renderer
 * (REQ-13 §Part 3). Downstream REQs ([[REQ-21]] DigestReport, [[REQ-28]]
 * ConvertConfirmation, etc.) wrap their content in this shell so every card
 * shares the same header / body / actions layout and tone styling.
 *
 * Mirrors the createChatPanel / createPreviewPanel factory style used
 * elsewhere in builder-ui — no React, no framework.
 */

export type ChatCardTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger";

export interface ChatCardOptions {
  readonly title: string;
  readonly icon?: string | Node;
  readonly tone?: ChatCardTone;
  /** Initial body content. Set later via `setBody`. */
  readonly body?: string | Node;
  /** Optional action buttons / controls. */
  readonly actions?: ReadonlyArray<{
    readonly label: string;
    readonly onClick: () => void;
    readonly variant?: "primary" | "secondary";
  }>;
  readonly collapsed?: boolean;
  readonly onToggleCollapse?: (collapsed: boolean) => void;
}

export interface ChatCardHandle {
  readonly root: HTMLElement;
  readonly header: HTMLElement;
  readonly body: HTMLElement;
  readonly actionsRow: HTMLElement;
  setBody(content: string | Node): void;
  setActions(
    actions: ReadonlyArray<{
      label: string;
      onClick: () => void;
      variant?: "primary" | "secondary";
    }>,
  ): void;
  setCollapsed(collapsed: boolean): void;
  isCollapsed(): boolean;
}

export function createChatCard(
  parent: Document | HTMLElement,
  options: ChatCardOptions,
): ChatCardHandle {
  const doc =
    parent instanceof Document
      ? parent
      : (parent.ownerDocument as Document);

  const tone: ChatCardTone = options.tone ?? "neutral";

  const root = doc.createElement("section");
  root.className = `fc-chat-card fc-chat-card--${tone}`;
  root.setAttribute("data-fc-chat-card", "");
  root.setAttribute("data-fc-chat-card-tone", tone);

  const header = doc.createElement("header");
  header.className = "fc-chat-card__header";
  header.setAttribute("data-fc-chat-card-header", "");

  if (options.icon !== undefined) {
    const iconEl = doc.createElement("span");
    iconEl.className = "fc-chat-card__icon";
    iconEl.setAttribute("data-fc-chat-card-icon", "");
    if (typeof options.icon === "string") {
      iconEl.textContent = options.icon;
    } else {
      iconEl.appendChild(options.icon);
    }
    header.appendChild(iconEl);
  }

  const titleEl = doc.createElement("span");
  titleEl.className = "fc-chat-card__title";
  titleEl.setAttribute("data-fc-chat-card-title", "");
  titleEl.textContent = options.title;
  header.appendChild(titleEl);

  let collapseButton: HTMLButtonElement | null = null;
  if (options.onToggleCollapse) {
    collapseButton = doc.createElement("button");
    collapseButton.type = "button";
    collapseButton.className = "fc-chat-card__caret";
    collapseButton.setAttribute("data-fc-chat-card-toggle", "");
    collapseButton.setAttribute("aria-label", "Toggle card body");
    header.appendChild(collapseButton);
  }

  const body = doc.createElement("div");
  body.className = "fc-chat-card__body";
  body.setAttribute("data-fc-chat-card-body", "");

  const actionsRow = doc.createElement("footer");
  actionsRow.className = "fc-chat-card__actions";
  actionsRow.setAttribute("data-fc-chat-card-actions", "");

  root.appendChild(header);
  root.appendChild(body);
  root.appendChild(actionsRow);

  let isCollapsed = options.collapsed ?? false;
  const applyCollapsedClass = (): void => {
    if (isCollapsed) {
      root.classList.add("is-collapsed");
      root.setAttribute("data-fc-chat-card-collapsed", "true");
      body.style.display = "none";
      actionsRow.style.display = "none";
      if (collapseButton) {
        collapseButton.textContent = "▸";
        collapseButton.setAttribute("aria-expanded", "false");
      }
    } else {
      root.classList.remove("is-collapsed");
      root.setAttribute("data-fc-chat-card-collapsed", "false");
      body.style.display = "";
      actionsRow.style.display = "";
      if (collapseButton) {
        collapseButton.textContent = "▾";
        collapseButton.setAttribute("aria-expanded", "true");
      }
    }
  };
  applyCollapsedClass();

  if (collapseButton && options.onToggleCollapse) {
    const cb = options.onToggleCollapse;
    collapseButton.addEventListener("click", () => {
      isCollapsed = !isCollapsed;
      applyCollapsedClass();
      cb(isCollapsed);
    });
  }

  const setBody = (content: string | Node): void => {
    body.innerHTML = "";
    if (typeof content === "string") {
      body.textContent = content;
    } else {
      body.appendChild(content);
    }
  };
  if (options.body !== undefined) setBody(options.body);

  const renderActions = (
    actions: ReadonlyArray<{
      label: string;
      onClick: () => void;
      variant?: "primary" | "secondary";
    }>,
  ): void => {
    actionsRow.innerHTML = "";
    for (const action of actions) {
      const btn = doc.createElement("button");
      btn.type = "button";
      const variant = action.variant ?? "secondary";
      btn.className = `fc-chat-card__action fc-chat-card__action--${variant}`;
      btn.setAttribute("data-fc-chat-card-action", action.label);
      btn.textContent = action.label;
      btn.addEventListener("click", () => action.onClick());
      actionsRow.appendChild(btn);
    }
    actionsRow.style.display =
      actions.length > 0 && !isCollapsed ? "" : "none";
  };
  renderActions(options.actions ?? []);

  if (parent instanceof HTMLElement) {
    parent.appendChild(root);
  }

  return {
    root,
    header,
    body,
    actionsRow,
    setBody,
    setActions(actions): void {
      renderActions(actions);
    },
    setCollapsed(next): void {
      if (isCollapsed === next) return;
      isCollapsed = next;
      applyCollapsedClass();
    },
    isCollapsed(): boolean {
      return isCollapsed;
    },
  };
}
