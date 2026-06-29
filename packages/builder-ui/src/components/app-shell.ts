/**
 * REQ-17: the per-site app shell. A vanilla-DOM host that every per-site
 * surface (Builder, Settings, Assets, Revisions, Leads) docks into. It owns:
 *
 *   - A top bar: site display name (left), tab bar (centre), avatar menu (right).
 *   - A content area below the bar that swaps to the active tab's factory output.
 *   - A chat panel docked to the right of the content area, with per-(site, tab)
 *     open/collapsed state persisted to localStorage.
 *   - `pushState` routing so each tab is a real, refresh-/back-friendly URL.
 *
 * Tab CONTENT is supplied by downstream REQs through `registerTab`. The shell
 * knows a fixed ordered set of tab slots (Builder | Settings | Assets |
 * Revisions | Leads); a slot is disabled until a factory is registered for it.
 */

/** The fixed, ordered tab slots the shell renders. Revisions/Leads ship
 *  disabled in v1 — they become clickable when a downstream REQ registers a
 *  factory for them. */
export interface TabSlot {
  readonly id: string;
  readonly label: string;
}

export const DEFAULT_TAB_SLOTS: readonly TabSlot[] = [
  { id: "builder", label: "Builder" },
  { id: "settings", label: "Settings" },
  { id: "assets", label: "Assets" },
  { id: "revisions", label: "Revisions" },
  { id: "leads", label: "Leads" },
];

/** localStorage key for per-(site, tab) chat open/collapsed state (REQ-17). */
export const CHAT_STATE_STORAGE_KEY = "1stcontact_app_chat_state_v1";

export type AvatarMenuItem = "sites" | "account" | "signout";

export interface TabInstance {
  /** Optional teardown, called when the shell is destroyed. */
  destroy?: () => void;
}

export interface TabRegistration {
  /** Display label for the tab button (overrides the slot's default label). */
  label?: string;
  /** Whether the chat panel starts open the first time this tab is shown. */
  defaultChatOpen: boolean;
  /**
   * Builds the tab's content. Called once, lazily, the first time the tab is
   * activated. Receives the content host (left of the chat panel) and the
   * chat slot (inside the shared chat panel frame) for this tab.
   */
  factory: (content: HTMLElement, chatSlot: HTMLElement) => TabInstance | void;
}

export interface AppShellOptions {
  /** Current site id (drives the URL and the per-(site, tab) chat key). */
  siteId: string;
  /** Shown top-left. Defaults to the site id. */
  siteDisplayName?: string;
  /** Tab to activate once it is registered. Defaults to the first registered. */
  initialTab?: string;
  /** Initials rendered in the avatar circle. Defaults to derived from site. */
  userInitials?: string;
  /** localStorage facility for chat state. Defaults to window.localStorage. */
  storage?: Storage | null;
  /** History facility for routing. Defaults to window.history. */
  history?: History;
  /** Window for popstate wiring. Defaults to the parent element's window. */
  windowRef?: Window;
  /** Location read for popstate fallback. Defaults to windowRef.location. */
  location?: { pathname: string };
  /** Avatar dropdown item handler. */
  onAvatarItem?: (item: AvatarMenuItem) => void;
  /** URL path for a (site, tab). Defaults to `/app/<site>/<tab>`. */
  tabPath?: (site: string, tab: string) => string;
  /** Override the tab slot set (and order). Defaults to DEFAULT_TAB_SLOTS. */
  tabSlots?: readonly TabSlot[];
}

export interface AppShellHandle {
  readonly root: HTMLElement;
  readonly topBar: HTMLElement;
  readonly tabBar: HTMLElement;
  readonly contentArea: HTMLElement;
  readonly chatPanel: HTMLElement;
  readonly avatarButton: HTMLButtonElement;
  readonly avatarMenu: HTMLElement;
  /** Attach a factory to a known tab slot, enabling its button. Unknown ids
   *  are a no-op + console.warn so downstream REQs can register independently. */
  registerTab(id: string, registration: TabRegistration): void;
  /** Show a tab. `push` controls whether a history entry is created. */
  activateTab(id: string, opts?: { push?: boolean }): void;
  getActiveTabId(): string | null;
  isChatOpen(tabId: string): boolean;
  /** Toggle the chat panel for a tab (defaults to the active tab). */
  toggleChat(tabId?: string): void;
  destroy(): void;
}

interface RegisteredTab {
  readonly slot: TabSlot;
  readonly button: HTMLButtonElement;
  registration: TabRegistration | null;
  contentEl: HTMLElement | null;
  chatSlotEl: HTMLElement | null;
  instance: TabInstance | void;
}

function defaultInitials(name: string): string {
  const parts = name.trim().split(/[\s_-]+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

function loadChatState(storage: Storage | null): Record<string, boolean> {
  if (!storage) return {};
  try {
    const raw = storage.getItem(CHAT_STATE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, boolean>;
    }
  } catch {
    // ignore corrupt state
  }
  return {};
}

/**
 * Mount the app shell into `parent`. Returns a handle exposing the tab
 * registration API, programmatic navigation, and teardown.
 */
export function createAppShell(
  parent: HTMLElement,
  options: AppShellOptions,
): AppShellHandle {
  const doc = parent.ownerDocument;
  const win = options.windowRef ?? doc.defaultView ?? (globalThis as unknown as Window);
  const hist = options.history ?? win.history;
  const loc = options.location ?? win.location;
  const storage = options.storage ?? null;
  const slots = options.tabSlots ?? DEFAULT_TAB_SLOTS;
  const siteId = options.siteId;
  const siteDisplayName = options.siteDisplayName ?? siteId;
  const tabPath =
    options.tabPath ?? ((site: string, tab: string) => `/app/${site}/${tab}`);

  // ---- DOM scaffold ----------------------------------------------------
  const root = doc.createElement("div");
  root.className = "fc-app";
  root.setAttribute("data-fc-app", "");

  const topBar = doc.createElement("header");
  topBar.className = "fc-app__topbar";
  topBar.setAttribute("data-fc-topbar", "");

  const siteName = doc.createElement("div");
  siteName.className = "fc-app__site";
  siteName.setAttribute("data-fc-site-name", "");
  siteName.textContent = siteDisplayName;

  const tabBar = doc.createElement("nav");
  tabBar.className = "fc-app__tabs";
  tabBar.setAttribute("data-fc-tabbar", "");
  tabBar.setAttribute("role", "tablist");

  const avatarWrap = doc.createElement("div");
  avatarWrap.className = "fc-app__avatar-wrap";

  const avatarButton = doc.createElement("button");
  avatarButton.type = "button";
  avatarButton.className = "fc-app__avatar";
  avatarButton.setAttribute("data-fc-avatar", "");
  avatarButton.setAttribute("aria-haspopup", "menu");
  avatarButton.setAttribute("aria-expanded", "false");
  avatarButton.textContent =
    options.userInitials ?? defaultInitials(siteDisplayName);

  const avatarMenu = doc.createElement("div");
  avatarMenu.className = "fc-app__avatar-menu";
  avatarMenu.setAttribute("data-fc-avatar-menu", "");
  avatarMenu.setAttribute("role", "menu");
  avatarMenu.hidden = true;

  const avatarItems: { item: AvatarMenuItem; label: string }[] = [
    { item: "sites", label: `Sites` },
    { item: "account", label: "Account" },
    { item: "signout", label: "Sign out" },
  ];
  for (const { item, label } of avatarItems) {
    const el = doc.createElement("button");
    el.type = "button";
    el.className = "fc-app__avatar-item";
    el.setAttribute("data-fc-avatar-item", item);
    el.setAttribute("role", "menuitem");
    // `Sites` marks the current site in v1 (multi-site listing deferred).
    el.textContent = item === "sites" ? `${siteDisplayName} ✓` : label;
    el.addEventListener("click", () => {
      closeAvatarMenu();
      options.onAvatarItem?.(item);
    });
    avatarMenu.appendChild(el);
  }
  avatarWrap.appendChild(avatarButton);
  avatarWrap.appendChild(avatarMenu);

  topBar.appendChild(siteName);
  topBar.appendChild(tabBar);
  topBar.appendChild(avatarWrap);

  // content row: tab content (left) + chat panel (right) + restore rail
  const contentRow = doc.createElement("div");
  contentRow.className = "fc-app__body";

  const contentArea = doc.createElement("div");
  contentArea.className = "fc-app__content";
  contentArea.setAttribute("data-fc-content", "");

  const chatPanel = doc.createElement("aside");
  chatPanel.className = "fc-app__chat";
  chatPanel.setAttribute("data-fc-chat", "");

  const chatHeader = doc.createElement("div");
  chatHeader.className = "fc-app__chat-header";
  const chatTitle = doc.createElement("span");
  chatTitle.className = "fc-app__chat-title";
  chatTitle.textContent = "Chat";
  const collapseButton = doc.createElement("button");
  collapseButton.type = "button";
  collapseButton.className = "fc-app__chat-collapse";
  collapseButton.setAttribute("data-fc-chat-collapse", "");
  collapseButton.setAttribute("aria-label", "Collapse chat");
  collapseButton.textContent = "›";
  chatHeader.appendChild(chatTitle);
  chatHeader.appendChild(collapseButton);

  const chatBody = doc.createElement("div");
  chatBody.className = "fc-app__chat-body";
  chatBody.setAttribute("data-fc-chat-body", "");

  chatPanel.appendChild(chatHeader);
  chatPanel.appendChild(chatBody);

  const restoreRail = doc.createElement("button");
  restoreRail.type = "button";
  restoreRail.className = "fc-app__chat-restore";
  restoreRail.setAttribute("data-fc-chat-restore", "");
  restoreRail.setAttribute("aria-label", "Open chat");
  restoreRail.textContent = "‹";
  restoreRail.hidden = true;

  contentRow.appendChild(contentArea);
  contentRow.appendChild(chatPanel);
  contentRow.appendChild(restoreRail);

  root.appendChild(topBar);
  root.appendChild(contentRow);
  parent.appendChild(root);

  // ---- tab registry ----------------------------------------------------
  const tabs = new Map<string, RegisteredTab>();
  let activeTabId: string | null = null;
  let firstActivation = true;
  let chatStateCache = loadChatState(storage);

  for (const slot of slots) {
    const button = doc.createElement("button");
    button.type = "button";
    button.className = "fc-app__tab";
    button.setAttribute("data-fc-tab", slot.id);
    button.setAttribute("role", "tab");
    button.textContent = slot.label;
    button.disabled = true; // enabled when a factory is registered
    button.addEventListener("click", () => {
      if (button.disabled) return;
      activateTab(slot.id, { push: true });
    });
    tabBar.appendChild(button);
    tabs.set(slot.id, {
      slot,
      button,
      registration: null,
      contentEl: null,
      chatSlotEl: null,
      instance: undefined,
    });
  }

  // ---- chat open/collapsed state --------------------------------------
  function chatKey(tabId: string): string {
    return `${siteId}::${tabId}`;
  }

  function isChatOpen(tabId: string): boolean {
    const key = chatKey(tabId);
    if (Object.prototype.hasOwnProperty.call(chatStateCache, key)) {
      return chatStateCache[key] === true;
    }
    return tabs.get(tabId)?.registration?.defaultChatOpen ?? false;
  }

  function persistChatOpen(tabId: string, open: boolean): void {
    chatStateCache = { ...chatStateCache, [chatKey(tabId)]: open };
    if (!storage) return;
    try {
      storage.setItem(CHAT_STATE_STORAGE_KEY, JSON.stringify(chatStateCache));
    } catch {
      // ignore quota / serialization errors
    }
  }

  function applyChatVisibility(tabId: string): void {
    const open = isChatOpen(tabId);
    chatPanel.hidden = !open;
    restoreRail.hidden = open;
  }

  function toggleChat(tabId?: string): void {
    const id = tabId ?? activeTabId;
    if (!id) return;
    const next = !isChatOpen(id);
    persistChatOpen(id, next);
    if (id === activeTabId) applyChatVisibility(id);
  }

  collapseButton.addEventListener("click", () => toggleChat());
  restoreRail.addEventListener("click", () => toggleChat());

  // ---- activation ------------------------------------------------------
  function ensureMounted(tab: RegisteredTab): void {
    if (tab.contentEl || !tab.registration) return;
    const content = doc.createElement("div");
    content.className = "fc-app__tab-content";
    content.setAttribute("data-fc-tab-content", tab.slot.id);
    content.hidden = true;
    contentArea.appendChild(content);

    const chatSlot = doc.createElement("div");
    chatSlot.className = "fc-app__chat-slot";
    chatSlot.setAttribute("data-fc-chat-slot", tab.slot.id);
    chatSlot.hidden = true;
    chatBody.appendChild(chatSlot);

    tab.contentEl = content;
    tab.chatSlotEl = chatSlot;
    tab.instance = tab.registration.factory(content, chatSlot);
  }

  function activateTab(id: string, opts: { push?: boolean } = {}): void {
    const tab = tabs.get(id);
    if (!tab || !tab.registration) {
      console.warn(`[app-shell] cannot activate unregistered tab '${id}'`);
      return;
    }
    if (id === activeTabId) return;

    // hide previous
    if (activeTabId) {
      const prev = tabs.get(activeTabId);
      if (prev) {
        prev.button.classList.remove("is-active");
        prev.button.setAttribute("aria-selected", "false");
        if (prev.contentEl) prev.contentEl.hidden = true;
        if (prev.chatSlotEl) prev.chatSlotEl.hidden = true;
      }
    }

    ensureMounted(tab);
    activeTabId = id;
    tab.button.classList.add("is-active");
    tab.button.setAttribute("aria-selected", "true");
    if (tab.contentEl) tab.contentEl.hidden = false;
    if (tab.chatSlotEl) tab.chatSlotEl.hidden = false;
    applyChatVisibility(id);

    const url = tabPath(siteId, id);
    if (firstActivation) {
      firstActivation = false;
      hist.replaceState({ tab: id }, "", url);
    } else if (opts.push !== false) {
      hist.pushState({ tab: id }, "", url);
    }
  }

  function registerTab(id: string, registration: TabRegistration): void {
    const tab = tabs.get(id);
    if (!tab) {
      console.warn(`[app-shell] ignoring registration for unknown tab '${id}'`);
      return;
    }
    tab.registration = registration;
    tab.button.disabled = false;
    if (registration.label) tab.button.textContent = registration.label;
    // Auto-activate the target tab as soon as it is available.
    if (
      activeTabId === null &&
      (options.initialTab === undefined || options.initialTab === id)
    ) {
      activateTab(id, { push: false });
    }
  }

  // ---- avatar menu -----------------------------------------------------
  function openAvatarMenu(): void {
    avatarMenu.hidden = false;
    avatarButton.setAttribute("aria-expanded", "true");
  }
  function closeAvatarMenu(): void {
    avatarMenu.hidden = true;
    avatarButton.setAttribute("aria-expanded", "false");
  }
  const onAvatarClick = (ev: Event): void => {
    ev.stopPropagation();
    if (avatarMenu.hidden) openAvatarMenu();
    else closeAvatarMenu();
  };
  const onDocClick = (ev: Event): void => {
    if (avatarMenu.hidden) return;
    if (ev.target instanceof Node && avatarWrap.contains(ev.target)) return;
    closeAvatarMenu();
  };
  avatarButton.addEventListener("click", onAvatarClick);
  doc.addEventListener("click", onDocClick);

  // ---- popstate routing ------------------------------------------------
  const onPopState = (ev: PopStateEvent): void => {
    const state = ev.state as { tab?: string } | null;
    let target = state?.tab;
    if (!target) {
      const m = loc.pathname.match(/^\/app\/[^/]+\/([^/]+)/);
      if (m) target = m[1];
    }
    if (target && target !== activeTabId && tabs.get(target)?.registration) {
      activateTab(target, { push: false });
    }
  };
  win.addEventListener("popstate", onPopState);

  function destroy(): void {
    win.removeEventListener("popstate", onPopState);
    doc.removeEventListener("click", onDocClick);
    avatarButton.removeEventListener("click", onAvatarClick);
    for (const tab of tabs.values()) {
      tab.instance?.destroy?.();
    }
    parent.removeChild(root);
  }

  return {
    root,
    topBar,
    tabBar,
    contentArea,
    chatPanel,
    avatarButton,
    avatarMenu,
    registerTab,
    activateTab,
    getActiveTabId: () => activeTabId,
    isChatOpen,
    toggleChat,
    destroy,
  };
}
