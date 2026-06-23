import type { Site } from "@gendev/site-schema";
import { buildFrameworkCatalog } from "./catalog.js";
import {
  BuilderStore,
  DEFAULT_STORAGE_KEY,
  type ChatMessage,
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
   * per-site session list and localStorage key for activeSessionId. Defaults
   * to "default" when omitted (single-tenant local dev).
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

/**
 * REQ-25: surface a chat-backend failure as a system message in the panel,
 * rather than swallowing it to console.warn. Includes the error text and
 * the most likely fix for local dev (migration not applied). The system
 * message is rendered as plain text by the chat panel.
 */
function appendBootErrorMessage(
  store: BuilderStore,
  siteId: string,
  err: unknown,
): void {
  const detail = err instanceof Error ? err.message : String(err);
  console.warn("[builder] chat backend unavailable", err);
  store.appendChatMessage({
    role: "system",
    content:
      `Chat backend unavailable.\n` +
      `Could not establish a chat session for site '${siteId}'.\n` +
      `Error: ${detail}\n\n` +
      `If running locally, apply the chat-table migrations:\n` +
      `  wrangler d1 migrations apply 1stcontact-sites --local`,
  });
}

/**
 * REQ-25 (second pass): pick the right session for this boot. Order:
 *   1. localStorage-stored active id, if it still exists on the server
 *   2. most-recently-used session for the site
 *   3. create a fresh one (returns the freshly created summary)
 *
 * A session always exists after this call — the panel never sees a
 * "no active session" state.
 */
async function ensureActiveSession(
  api: ChatsApi,
  siteId: string,
  storage: Storage | null,
): Promise<SessionSummary> {
  const sessions = await api.listSessions(siteId);
  const persisted = storage?.getItem(activeChatStorageKey(siteId));
  if (persisted) {
    const match = sessions.find((s) => s.id === persisted);
    if (match) return match;
  }
  if (sessions.length > 0) return sessions[0]!;
  const created = await api.createSession(siteId);
  return created;
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

  // REQ-25: load the tail of the active session and write it into the
  // store. Called once during boot.
  const loadAndActivate = async (sid: string): Promise<void> => {
    const page = await chatsApi.loadTail(sid, TAIL_LIMIT);
    const messages: ChatMessage[] = page.messages.map((m) => m.message);
    const loadedFromOrd =
      page.messages.length > 0 ? page.messages[0]!.ord : null;
    store.setActiveSession(sid, {
      chatHistory: messages,
      loadedFromOrd,
      hasMoreOlder: page.hasMoreOlder,
    });
    if (storage) storage.setItem(activeChatStorageKey(siteId), sid);
  };

  // REQ-25: lazy-loaded chat-panel handle (assigned after createChatPanel
  // below). The closures above need this to anchor scroll during infinite
  // scroll prepend, but createChatPanel needs the handlers below.
  type ChatPanelHandle = ReturnType<typeof createChatPanel>;
  let chat: ChatPanelHandle | null = null;

  const chat_ = createChatPanel(layout.chatPanel, {
    store,
    onSend: async (text: string) => {
      // REQ-25 (second pass): the boot promise always ensures a session
      // exists. If onSend fires before boot finishes (unlikely — the
      // editor is mounted synchronously but the operator can't type
      // before paint), wait for activation. If activation still fails,
      // surface the error in-panel instead of throwing into the void.
      if (!store.getState().activeSessionId) {
        try {
          const session = await ensureActiveSession(chatsApi, siteId, storage);
          await loadAndActivate(session.id);
        } catch (err) {
          appendBootErrorMessage(store, siteId, err);
          return;
        }
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
    },
    onStop: () => {
      abortController?.abort();
      abortController = null;
    },
    sessionHandlers: {
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

  // REQ-25 (second pass): ensure the operator boots into a live, persisted
  // chat session every time — no empty state, no UI to manage sessions.
  // Failures surface as a system message in the chat (operator-visible)
  // rather than a silent console.warn.
  void (async () => {
    try {
      const session = await ensureActiveSession(chatsApi, siteId, storage);
      await loadAndActivate(session.id);
    } catch (err) {
      appendBootErrorMessage(store, siteId, err);
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
