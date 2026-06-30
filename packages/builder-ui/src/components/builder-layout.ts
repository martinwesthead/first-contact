import {
  createSplitLayout,
  type SplitLayoutState,
} from "./split-layout.js";

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
 * Chat-left / preview-right builder layout (REQ-8). A thin adapter over the
 * generic {@link createSplitLayout}: it maps `leftPanel`/`rightPanel` to the
 * builder's `chatPanel`/`previewPanel`, owns the legacy
 * `1stcontact_builder_panels_v1` persistence shape (`{chatWidthPx, collapsed}`),
 * and overlays the builder's CSS class names + data attributes so existing
 * styles and selectors keep working.
 */
export function createBuilderLayout(
  parent: HTMLElement,
  options: BuilderLayoutOptions = {},
): BuilderLayoutHandle {
  const storage = options.storage ?? null;
  const key = options.storageKey ?? DEFAULT_KEY;
  const initial = loadPanelState(storage, key);

  const split = createSplitLayout(parent, {
    initialLeftWidthPx:
      initial?.chatWidthPx ?? options.initialChatWidthPx ?? DEFAULT_WIDTH,
    initialCollapsed: initial?.collapsed ?? false,
    minLeftWidthPx: options.minChatWidthPx ?? DEFAULT_MIN,
    maxLeftWidthPx: options.maxChatWidthPx ?? DEFAULT_MAX,
    collapsedBarWidthPx: options.collapsedBarWidthPx ?? DEFAULT_COLLAPSED_BAR,
    collapseLabel: "Collapse chat",
    restoreLabel: "Restore chat",
    onStateChange: (s) => persistPanelState(storage, key, toPanelState(s)),
  });

  // Overlay the builder's legacy class names + data attributes so existing CSS
  // (`.fc-builder__*`) and any `[data-fc-*]` selectors continue to resolve.
  decorate(split.root, "fc-builder", "data-fc-builder");
  decorate(split.leftPanel, "fc-builder__chat", "data-fc-chat-panel");
  decorate(split.splitter, "fc-builder__splitter", "data-fc-splitter");
  decorate(split.restoreBar, "fc-builder__restore", "data-fc-restore");
  decorate(split.rightPanel, "fc-builder__preview", "data-fc-preview-panel");
  decorate(split.collapseButton, "fc-builder__collapse", "data-fc-collapse");

  return {
    root: split.root,
    chatPanel: split.leftPanel,
    previewPanel: split.rightPanel,
    splitter: split.splitter,
    collapseButton: split.collapseButton,
    restoreBar: split.restoreBar,
    getPanelState: () => toPanelState(split.getState()),
    collapseChat: split.collapse,
    restoreChat: split.restore,
    destroy: split.destroy,
  };
}

function decorate(el: HTMLElement, className: string, dataAttr: string): void {
  el.className = className;
  el.setAttribute(dataAttr, "");
}

function toPanelState(s: SplitLayoutState): PanelState {
  return { chatWidthPx: s.leftWidthPx, collapsed: s.collapsed };
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

function persistPanelState(
  storage: Storage | null,
  key: string,
  state: PanelState,
): void {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(state));
  } catch {
    // ignore quota / serialization failures
  }
}
