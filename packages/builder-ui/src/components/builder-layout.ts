export interface PanelState {
  chatWidthPx: number;
  collapsed: boolean;
}

export interface BuilderLayoutHandle {
  readonly root: HTMLElement;
  readonly chatPanel: HTMLElement;
  readonly previewPanel: HTMLElement;
  readonly splitter: HTMLElement;
  readonly collapseButton: HTMLElement;
  readonly restoreBar: HTMLElement;
  getPanelState(): PanelState;
  collapseChat(): void;
  restoreChat(): void;
  destroy(): void;
}

export interface BuilderLayoutOptions {
  storage?: Storage | null;
  storageKey?: string;
  initialChatWidthPx?: number;
  minChatWidthPx?: number;
  maxChatWidthPx?: number;
  collapsedBarWidthPx?: number;
}

const DEFAULT_KEY = "1stcontact_builder_panels_v1";
const DEFAULT_WIDTH = 360;
const DEFAULT_MIN = 200;
const DEFAULT_MAX = 800;
const DEFAULT_COLLAPSED_BAR = 32;

/**
 * Vanilla DOM builder layout — mirrors the XGD #chat-list-panel pattern:
 * draggable splitter, chevron-collapse to a thin restore bar, persisted state.
 *
 * Returns an `HTMLElement` root containing the chat panel, splitter, and
 * preview panel, plus methods for programmatic collapse / restore.
 */
export function createBuilderLayout(
  parent: HTMLElement,
  options: BuilderLayoutOptions = {},
): BuilderLayoutHandle {
  const storage = options.storage ?? null;
  const key = options.storageKey ?? DEFAULT_KEY;
  const minWidth = options.minChatWidthPx ?? DEFAULT_MIN;
  const maxWidth = options.maxChatWidthPx ?? DEFAULT_MAX;
  const collapsedBar = options.collapsedBarWidthPx ?? DEFAULT_COLLAPSED_BAR;
  const initial = loadPanelState(storage, key) ?? {
    chatWidthPx: options.initialChatWidthPx ?? DEFAULT_WIDTH,
    collapsed: false,
  };

  let state: PanelState = clamp(initial, minWidth, maxWidth);

  const root = parent.ownerDocument.createElement("div");
  root.className = "fc-builder";
  root.setAttribute("data-fc-builder", "");

  const chatPanel = parent.ownerDocument.createElement("div");
  chatPanel.className = "fc-builder__chat";
  chatPanel.setAttribute("data-fc-chat-panel", "");

  const collapseButton = parent.ownerDocument.createElement("button");
  collapseButton.type = "button";
  collapseButton.className = "fc-builder__collapse";
  collapseButton.setAttribute("data-fc-collapse", "");
  collapseButton.setAttribute("aria-label", "Collapse chat");
  collapseButton.textContent = "‹";
  chatPanel.appendChild(collapseButton);

  const splitter = parent.ownerDocument.createElement("div");
  splitter.className = "fc-builder__splitter";
  splitter.setAttribute("data-fc-splitter", "");
  splitter.setAttribute("role", "separator");
  splitter.setAttribute("aria-orientation", "vertical");

  const previewPanel = parent.ownerDocument.createElement("div");
  previewPanel.className = "fc-builder__preview";
  previewPanel.setAttribute("data-fc-preview-panel", "");

  const restoreBar = parent.ownerDocument.createElement("button");
  restoreBar.type = "button";
  restoreBar.className = "fc-builder__restore";
  restoreBar.setAttribute("data-fc-restore", "");
  restoreBar.setAttribute("aria-label", "Restore chat");
  restoreBar.textContent = "›";

  root.appendChild(chatPanel);
  root.appendChild(splitter);
  root.appendChild(previewPanel);
  root.appendChild(restoreBar);
  parent.appendChild(root);

  applyLayout();

  // Drag-to-resize.
  let dragOriginX = 0;
  let dragOriginWidth = 0;

  const onPointerMove = (event: PointerEvent): void => {
    const delta = event.clientX - dragOriginX;
    const next = clampWidth(dragOriginWidth + delta);
    state = { ...state, chatWidthPx: next };
    applyLayout();
  };
  const onPointerUp = (event: PointerEvent): void => {
    splitter.releasePointerCapture(event.pointerId);
    splitter.removeEventListener("pointermove", onPointerMove);
    splitter.removeEventListener("pointerup", onPointerUp);
    persist();
  };
  const onPointerDown = (event: PointerEvent): void => {
    dragOriginX = event.clientX;
    dragOriginWidth = state.chatWidthPx;
    splitter.setPointerCapture(event.pointerId);
    splitter.addEventListener("pointermove", onPointerMove);
    splitter.addEventListener("pointerup", onPointerUp);
  };
  splitter.addEventListener("pointerdown", onPointerDown);

  const onCollapse = (): void => collapseChat();
  const onRestore = (): void => restoreChat();
  collapseButton.addEventListener("click", onCollapse);
  restoreBar.addEventListener("click", onRestore);

  function clampWidth(n: number): number {
    return Math.max(minWidth, Math.min(maxWidth, Math.round(n)));
  }

  function applyLayout(): void {
    if (state.collapsed) {
      chatPanel.style.display = "none";
      splitter.style.display = "none";
      restoreBar.style.display = "";
      restoreBar.style.width = `${collapsedBar}px`;
      previewPanel.style.flex = "1 1 auto";
    } else {
      chatPanel.style.display = "";
      splitter.style.display = "";
      restoreBar.style.display = "none";
      chatPanel.style.width = `${state.chatWidthPx}px`;
      chatPanel.style.flex = `0 0 ${state.chatWidthPx}px`;
      previewPanel.style.flex = "1 1 auto";
    }
  }

  function persist(): void {
    if (!storage) return;
    try {
      storage.setItem(key, JSON.stringify(state));
    } catch {
      // ignore
    }
  }

  function collapseChat(): void {
    state = { ...state, collapsed: true };
    applyLayout();
    persist();
  }

  function restoreChat(): void {
    state = { ...state, collapsed: false };
    applyLayout();
    persist();
  }

  function destroy(): void {
    splitter.removeEventListener("pointerdown", onPointerDown);
    collapseButton.removeEventListener("click", onCollapse);
    restoreBar.removeEventListener("click", onRestore);
    parent.removeChild(root);
  }

  return {
    root,
    chatPanel,
    previewPanel,
    splitter,
    collapseButton,
    restoreBar,
    getPanelState: () => state,
    collapseChat,
    restoreChat,
    destroy,
  };
}

function loadPanelState(storage: Storage | null, key: string): PanelState | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PanelState>;
    if (
      typeof parsed.chatWidthPx !== "number" ||
      typeof parsed.collapsed !== "boolean"
    ) {
      return null;
    }
    return { chatWidthPx: parsed.chatWidthPx, collapsed: parsed.collapsed };
  } catch {
    return null;
  }
}

function clamp(state: PanelState, min: number, max: number): PanelState {
  return {
    ...state,
    chatWidthPx: Math.max(min, Math.min(max, state.chatWidthPx)),
  };
}
