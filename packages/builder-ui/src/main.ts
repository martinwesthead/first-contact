import type { Site } from "@1stcontact/site-schema";
import { buildFrameworkCatalog } from "./catalog.js";
import {
  BuilderStore,
  DEFAULT_STORAGE_KEY,
  type ChatMessage,
  type ChatSessionSummary,
} from "./store.js";
import { ChatsApi, type SessionSummary } from "./chats-api.js";
import { createBuilderLayout } from "./components/builder-layout.js";
import { createChatPanel } from "./components/chat-panel.js";
import { createPreviewPanel } from "./components/preview-panel.js";
import { registerDigestReport } from "./components/digest-report.js";
import { registerTranscribeProgress } from "./components/transcribe-progress.js";
import { runChatTurn } from "./chat-driver.js";

export interface BootBuilderOptions {
  root: HTMLElement;
  /** Initial site definition. Caller is responsible for loading it (e.g. from a starter-sites JSON). */
  initialSite: Site;
  /**
   * REQ-25: ID of the site whose chats this builder load owns. Used for the
   * per-site session list and localStorage key for activeSessionId. Falls
   * back to `initialSite.config.id` when present, else `"unknown"`.
   */
  siteId?: string;
  /** Chat endpoint. Defaults to '/api/chat' (same-origin). */
  chatEndpoint?: string;
  /** localStorage facility — defaults to window.localStorage when present. */
  storage?: Storage | null;
  /**
   * Override the confirm/reload primitives the Reset button uses. Defaults to
   * window.confirm and window.location.reload. Test-only injection point.
   */
  resetPrompt?: (message: string) => boolean;
  reloadPage?: () => void;
  /** Override the storage key the Reset button clears. Defaults to DEFAULT_STORAGE_KEY. */
  storageKey?: string;
  /**
   * Per-tab session ID sent on every chat POST as `x-session-id`. Operator
   * actions that track per-session state (e.g. transcribe_site convert
   * consent) require it. When omitted the builder reads/writes a stable ID
   * from `sessionStorage` under SESSION_ID_STORAGE_KEY, generating a fresh
   * UUID on first boot.
   */
  sessionId?: string;
  /**
   * sessionStorage facility used to persist the auto-generated sessionId for
   * the lifetime of the tab. Defaults to window.sessionStorage when present.
   * Set to null to disable persistence (a fresh ID is minted each boot).
   */
  sessionStorageFacility?: Storage | null;
  /**
   * REQ-25 test-injection point: override fetch for the ChatsApi (and the
   * underlying chat-driver). Defaults to globalThis.fetch.
   */
  fetch?: typeof fetch;
  /** REQ-25 test-injection point: confirm prompt for delete-session. */
  confirmPrompt?: (message: string) => boolean;
}

export const SESSION_ID_STORAGE_KEY = "fc.builder.sessionId";

/** REQ-25: localStorage key prefix for active chat session per site. */
const ACTIVE_CHAT_SESSION_KEY_PREFIX = "fc.builder.activeChatSession.";

/** REQ-25: page size for tail-load and infinite scroll. */
const TAIL_LIMIT = 50;

function resolveSessionId(
  explicit: string | undefined,
  store: Storage | null,
): string {
  if (typeof explicit === "string" && explicit.length > 0) return explicit;
  if (store) {
    const existing = store.getItem(SESSION_ID_STORAGE_KEY);
    if (typeof existing === "string" && existing.length > 0) return existing;
  }
  const fresh =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `sess-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  if (store) store.setItem(SESSION_ID_STORAGE_KEY, fresh);
  return fresh;
}

function activeChatStorageKey(siteId: string): string {
  return `${ACTIVE_CHAT_SESSION_KEY_PREFIX}${siteId}`;
}

function toSummary(s: SessionSummary): ChatSessionSummary {
  return {
    id: s.id,
    title: s.title,
    lastMessageAt: s.lastMessageAt,
    messageCount: s.messageCount,
  };
}

/**
 * SPA entry point. Mounts the two-panel builder into `root`, wires the chat
 * driver to the preview, and persists state to localStorage. Returns a teardown
 * function and a handle to the underlying store for tests and embedders.
 */
export function bootBuilder(options: BootBuilderOptions): {
  store: BuilderStore;
  destroy: () => void;
} {
  const storage = options.storage ?? globalThis.localStorage ?? null;
  const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
  const resetPrompt =
    options.resetPrompt ?? ((msg: string) => globalThis.confirm?.(msg) ?? false);
  const reloadPage =
    options.reloadPage ?? (() => globalThis.location?.reload?.());
  const sessionStorageFacility =
    options.sessionStorageFacility !== undefined
      ? options.sessionStorageFacility
      : (globalThis.sessionStorage ?? null);
  const sessionId = resolveSessionId(options.sessionId, sessionStorageFacility);
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const siteId = options.siteId ?? "default";
  registerDigestReport();
  registerTranscribeProgress();
  const catalog = buildFrameworkCatalog();
  const store = new BuilderStore(
    { siteDefinition: options.initialSite, chatHistory: [] },
    { storage, storageKey },
  );

  const chatsApi = new ChatsApi({ fetch: fetchImpl });

  const layout = createBuilderLayout(options.root, { storage });
  const preview = createPreviewPanel(layout.previewPanel, {
    onReset: () => {
      if (
        !resetPrompt(
          "Reset the site to the 1stcontact baseline? Edits will be lost.",
        )
      ) {
        return;
      }
      storage?.removeItem(storageKey);
      reloadPage();
    },
  });
  let abortController: AbortController | null = null;
  const formatToolArg = (
    input: Record<string, unknown>,
  ): string | undefined => {
    for (const key of ["command", "file_path", "pattern", "query", "prompt", "field", "name"]) {
      const v = input[key];
      if (typeof v === "string") return v.length > 120 ? v.slice(0, 120) + "…" : v;
    }
    return undefined;
  };

  // REQ-25: load the tail of a session and write it into the store. Reused
  // by initial hydrate, session switch, and new-session creation.
  const loadAndActivateSession = async (
    sessionId: string,
  ): Promise<void> => {
    const page = await chatsApi.loadTail(sessionId, TAIL_LIMIT);
    const messages: ChatMessage[] = page.messages.map((m) => m.message);
    const loadedFromOrd =
      page.messages.length > 0 ? page.messages[0]!.ord : null;
    store.setActiveSession(sessionId, {
      chatHistory: messages,
      loadedFromOrd,
      hasMoreOlder: page.hasMoreOlder,
    });
    if (storage) {
      storage.setItem(activeChatStorageKey(siteId), sessionId);
    }
  };

  // REQ-25: lazy-loaded chat-panel handle (assigned after createChatPanel
  // below). The closures above need this to anchor scroll during infinite
  // scroll prepend, but createChatPanel needs the handlers below.
  type ChatPanelHandle = ReturnType<typeof createChatPanel>;
  let chat: ChatPanelHandle | null = null;

  const chat_ = createChatPanel(layout.chatPanel, {
    store,
    confirmPrompt: options.confirmPrompt,
    onSend: async (text: string) => {
      // REQ-25: if no session is active (fresh load with zero sessions), the
      // send handler creates one first. Mirrors the "new chat" affordance.
      if (!store.getState().activeSessionId) {
        const created = await chatsApi.createSession(siteId);
        store.upsertSession(toSummary(created));
        await loadAndActivateSession(created.id);
      }
      abortController = new AbortController();
      await runChatTurn(text, {
        store,
        catalog,
        endpoint: options.chatEndpoint,
        sessionId,
        fetch: fetchImpl,
        signal: abortController.signal,
        onTurnStart: () => chat?.clearToolEvents(),
        onToolCallStart: (event) => {
          chat?.expandToolPane();
          chat?.appendToolEvent({
            name: event.name,
            inputSummary: formatToolArg(event.input),
            status: event.status,
          });
        },
      });
      abortController = null;
      // Refresh the session list so message_count / lastMessageAt updates.
      try {
        const refreshed = await chatsApi.listSessions(siteId);
        store.setSessions(refreshed.map(toSummary));
      } catch (err) {
        console.warn("[builder] failed to refresh session list after turn", err);
      }
    },
    onStop: () => {
      abortController?.abort();
      abortController = null;
    },
    sessionHandlers: {
      onSelectSession: async (id) => {
        await loadAndActivateSession(id);
      },
      onNewSession: async () => {
        const created = await chatsApi.createSession(siteId);
        store.upsertSession(toSummary(created));
        await loadAndActivateSession(created.id);
      },
      onDeleteSession: async (id) => {
        await chatsApi.deleteSession(id);
        store.removeSession(id);
        if (storage) storage.removeItem(activeChatStorageKey(siteId));
        // Pick a fallback active session if any remain.
        const remaining = store.getState().sessions;
        if (remaining.length > 0) {
          await loadAndActivateSession(remaining[0]!.id);
        }
      },
      onRenameSession: async (id, title) => {
        const updated = await chatsApi.patchSessionTitle(id, title);
        store.upsertSession(toSummary(updated));
      },
      onScrollToTop: async () => {
        const state = store.getState();
        if (!state.hasMoreOlder || state.activeSessionId === null) return;
        if (state.loadedFromOrd === null) return;
        const page = await chatsApi.loadBefore(
          state.activeSessionId,
          state.loadedFromOrd,
          TAIL_LIMIT,
        );
        const messages = page.messages.map((m) => m.message);
        const newOrd =
          page.messages.length > 0
            ? page.messages[0]!.ord
            : state.loadedFromOrd;
        chat?.withScrollAnchor(() => {
          store.prependOlderMessages(messages, newOrd, page.hasMoreOlder);
        });
      },
    },
  });
  chat = chat_;

  // REQ-25: initial hydration. Listing sessions and restoring the
  // operator's last-active session happen in the background so the panel
  // doesn't block on the network.
  void (async () => {
    try {
      const summaries = await chatsApi.listSessions(siteId);
      store.setSessions(summaries.map(toSummary));
      const persisted = storage?.getItem(activeChatStorageKey(siteId));
      const activeId =
        persisted && summaries.some((s) => s.id === persisted)
          ? persisted
          : summaries.length > 0
            ? summaries[0]!.id
            : null;
      if (activeId) {
        await loadAndActivateSession(activeId);
      }
    } catch (err) {
      console.warn("[builder] failed to hydrate chat sessions", err);
    }
  })();

  const unsubscribe = store.subscribe((state) => {
    preview.render(state.siteDefinition);
  });
  preview.render(store.getState().siteDefinition);

  return {
    store,
    destroy: () => {
      unsubscribe();
      chat?.destroy();
      layout.destroy();
    },
  };
}
