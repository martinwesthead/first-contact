export interface SplitLayoutState {
  leftWidthPx: number;
  collapsed: boolean;
}

export interface SplitLayoutHandle {
  readonly root: HTMLElement;
  readonly leftPanel: HTMLElement;
  readonly rightPanel: HTMLElement;
  readonly splitter: HTMLElement;
  readonly collapseButton: HTMLElement;
  readonly restoreBar: HTMLElement;
  getState(): SplitLayoutState;
  collapse(): void;
  restore(): void;
  destroy(): void;
}

export interface SplitLayoutOptions {
  /** Built-in persistence: when set, state is read/written as the generic
   *  `{leftWidthPx, collapsed}` shape under `storageKey`. Consumers that need a
   *  different serialized shape (e.g. builder-layout) should omit `storage` and
   *  use `initialLeftWidthPx` / `initialCollapsed` + `onStateChange` instead. */
  storage?: Storage | null;
  storageKey?: string;
  initialLeftWidthPx?: number;
  initialCollapsed?: boolean;
  minLeftWidthPx?: number;
  maxLeftWidthPx?: number;
  collapsedBarWidthPx?: number;
  /** aria-label for the collapse chevron (defaults "Collapse panel"). */
  collapseLabel?: string;
  /** aria-label for the restore rail (defaults "Restore panel"). */
  restoreLabel?: string;
  /** Called after every committed state change (drag release, collapse,
   *  restore). Use this to persist in a custom shape. */
  onStateChange?: (state: SplitLayoutState) => void;
}

const DEFAULT_KEY = "1stcontact_split_layout_v1";
const DEFAULT_WIDTH = 360;
const DEFAULT_MIN = 200;
const DEFAULT_MAX = 800;
const DEFAULT_COLLAPSED_BAR = 32;

/**
 * Vanilla DOM two-panel split with a draggable vertical splitter and a
 * chevron-collapse of the LEFT panel to a thin restore rail. Generalised from
 * the original builder layout (REQ-8) so other surfaces — the Assets tab
 * (REQ-16) and beyond — can reuse the same interaction without inheriting the
 * builder's chat/preview naming.
 *
 * DOM order is `[leftPanel, splitter, restoreBar, rightPanel]`: the restore bar
 * sits before the right panel so a collapsed layout reads `[rail | right]` with
 * the rail on the left edge where the left panel was.
 */
export function createSplitLayout(
  parent: HTMLElement,
  options: SplitLayoutOptions = {},
): SplitLayoutHandle {
  const doc = parent.ownerDocument;
  const storage = options.storage ?? null;
  const key = options.storageKey ?? DEFAULT_KEY;
  const minWidth = options.minLeftWidthPx ?? DEFAULT_MIN;
  const maxWidth = options.maxLeftWidthPx ?? DEFAULT_MAX;
  const collapsedBar = options.collapsedBarWidthPx ?? DEFAULT_COLLAPSED_BAR;

  const loaded = loadState(storage, key);
  let state: SplitLayoutState = clamp(
    loaded ?? {
      leftWidthPx: options.initialLeftWidthPx ?? DEFAULT_WIDTH,
      collapsed: options.initialCollapsed ?? false,
    },
    minWidth,
    maxWidth,
  );

  const root = doc.createElement("div");
  root.className = "fc-split";
  root.setAttribute("data-fc-split", "");
  root.style.display = "flex";
  root.style.height = "100%";

  const leftPanel = doc.createElement("div");
  leftPanel.className = "fc-split__left";
  leftPanel.setAttribute("data-fc-split-left", "");

  const collapseButton = doc.createElement("button");
  collapseButton.type = "button";
  collapseButton.className = "fc-split__collapse";
  collapseButton.setAttribute("data-fc-split-collapse", "");
  collapseButton.setAttribute("aria-label", options.collapseLabel ?? "Collapse panel");
  collapseButton.textContent = "‹";
  leftPanel.appendChild(collapseButton);

  const splitter = doc.createElement("div");
  splitter.className = "fc-split__splitter";
  splitter.setAttribute("data-fc-split-splitter", "");
  splitter.setAttribute("role", "separator");
  splitter.setAttribute("aria-orientation", "vertical");

  const restoreBar = doc.createElement("button");
  restoreBar.type = "button";
  restoreBar.className = "fc-split__restore";
  restoreBar.setAttribute("data-fc-split-restore", "");
  restoreBar.setAttribute("aria-label", options.restoreLabel ?? "Restore panel");
  restoreBar.textContent = "›";
  restoreBar.style.alignItems = "center";
  restoreBar.style.justifyContent = "center";
  restoreBar.style.height = "100%";
  restoreBar.style.flexShrink = "0";

  const rightPanel = doc.createElement("div");
  rightPanel.className = "fc-split__right";
  rightPanel.setAttribute("data-fc-split-right", "");

  // Order matters: restoreBar before rightPanel so the collapsed rail appears
  // on the left edge (where the left panel was), not the right.
  root.appendChild(leftPanel);
  root.appendChild(splitter);
  root.appendChild(restoreBar);
  root.appendChild(rightPanel);
  parent.appendChild(root);

  applyLayout();

  // Drag-to-resize.
  let dragOriginX = 0;
  let dragOriginWidth = 0;

  const onPointerMove = (event: PointerEvent): void => {
    const delta = event.clientX - dragOriginX;
    state = { ...state, leftWidthPx: clampWidth(dragOriginWidth + delta) };
    applyLayout();
  };
  const onPointerUp = (event: PointerEvent): void => {
    splitter.releasePointerCapture(event.pointerId);
    splitter.removeEventListener("pointermove", onPointerMove);
    splitter.removeEventListener("pointerup", onPointerUp);
    commit();
  };
  const onPointerDown = (event: PointerEvent): void => {
    dragOriginX = event.clientX;
    dragOriginWidth = state.leftWidthPx;
    splitter.setPointerCapture(event.pointerId);
    splitter.addEventListener("pointermove", onPointerMove);
    splitter.addEventListener("pointerup", onPointerUp);
  };
  splitter.addEventListener("pointerdown", onPointerDown);

  const onCollapse = (): void => collapse();
  const onRestore = (): void => restore();
  collapseButton.addEventListener("click", onCollapse);
  restoreBar.addEventListener("click", onRestore);

  function clampWidth(n: number): number {
    return Math.max(minWidth, Math.min(maxWidth, Math.round(n)));
  }

  function applyLayout(): void {
    if (state.collapsed) {
      leftPanel.style.display = "none";
      splitter.style.display = "none";
      restoreBar.style.display = "";
      restoreBar.style.width = `${collapsedBar}px`;
      rightPanel.style.flex = "1 1 auto";
    } else {
      leftPanel.style.display = "";
      splitter.style.display = "";
      restoreBar.style.display = "none";
      leftPanel.style.width = `${state.leftWidthPx}px`;
      leftPanel.style.flex = `0 0 ${state.leftWidthPx}px`;
      rightPanel.style.flex = "1 1 auto";
    }
  }

  function commit(): void {
    if (storage) {
      try {
        storage.setItem(key, JSON.stringify(state));
      } catch {
        // ignore quota / serialization failures
      }
    }
    options.onStateChange?.(state);
  }

  function collapse(): void {
    state = { ...state, collapsed: true };
    applyLayout();
    commit();
  }

  function restore(): void {
    state = { ...state, collapsed: false };
    applyLayout();
    commit();
  }

  function destroy(): void {
    splitter.removeEventListener("pointerdown", onPointerDown);
    collapseButton.removeEventListener("click", onCollapse);
    restoreBar.removeEventListener("click", onRestore);
    parent.removeChild(root);
  }

  return {
    root,
    leftPanel,
    rightPanel,
    splitter,
    collapseButton,
    restoreBar,
    getState: () => state,
    collapse,
    restore,
    destroy,
  };
}

function loadState(storage: Storage | null, key: string): SplitLayoutState | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SplitLayoutState>;
    if (
      typeof parsed.leftWidthPx !== "number" ||
      typeof parsed.collapsed !== "boolean"
    ) {
      return null;
    }
    return { leftWidthPx: parsed.leftWidthPx, collapsed: parsed.collapsed };
  } catch {
    return null;
  }
}

function clamp(
  state: SplitLayoutState,
  min: number,
  max: number,
): SplitLayoutState {
  return {
    ...state,
    leftWidthPx: Math.max(min, Math.min(max, state.leftWidthPx)),
  };
}
