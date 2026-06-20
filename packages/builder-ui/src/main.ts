import type { Site } from "@1stcontact/site-schema";
import { buildFrameworkCatalog } from "./catalog.js";
import { BuilderStore, DEFAULT_STORAGE_KEY } from "./store.js";
import { createBuilderLayout } from "./components/builder-layout.js";
import { createChatPanel } from "./components/chat-panel.js";
import { createPreviewPanel } from "./components/preview-panel.js";
import { registerDigestReport } from "./components/digest-report.js";
import { registerConvertConfirmation } from "./components/convert-confirmation.js";
import { runChatTurn } from "./chat-driver.js";

export interface BootBuilderOptions {
  root: HTMLElement;
  /** Initial site definition. Caller is responsible for loading it (e.g. from a starter-sites JSON). */
  initialSite: Site;
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
}

export const SESSION_ID_STORAGE_KEY = "fc.builder.sessionId";

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
  registerDigestReport();
  registerConvertConfirmation();
  const catalog = buildFrameworkCatalog();
  const store = new BuilderStore(
    { siteDefinition: options.initialSite, chatHistory: [] },
    { storage, storageKey },
  );

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
  const chat = createChatPanel(layout.chatPanel, {
    store,
    onSend: async (text: string) => {
      await runChatTurn(text, {
        store,
        catalog,
        endpoint: options.chatEndpoint,
        sessionId,
      });
    },
  });

  const unsubscribe = store.subscribe((state) => {
    preview.render(state.siteDefinition);
  });
  preview.render(store.getState().siteDefinition);

  const doc = options.root.ownerDocument;
  const handleConvertConfirmed = (event: Event): void => {
    const detail = (event as CustomEvent).detail as
      | { url?: string; ownsSite?: boolean }
      | null
      | undefined;
    const url = detail?.url ?? "";
    const ownsClause = detail?.ownsSite === true ? " I own this site." : "";
    const text = `I confirm. Proceed with converting ${url}.${ownsClause}`;
    void runChatTurn(text, {
      store,
      catalog,
      endpoint: options.chatEndpoint,
      sessionId,
    });
  };
  const handleConvertCancelled = (event: Event): void => {
    const detail = (event as CustomEvent).detail as
      | { url?: string }
      | null
      | undefined;
    const url = detail?.url ?? "";
    const text = `Cancel the conversion${url ? ` of ${url}` : ""}.`;
    void runChatTurn(text, {
      store,
      catalog,
      endpoint: options.chatEndpoint,
      sessionId,
    });
  };
  doc.addEventListener("fc:convert-confirmed", handleConvertConfirmed);
  doc.addEventListener("fc:convert-cancelled", handleConvertCancelled);

  return {
    store,
    destroy: () => {
      doc.removeEventListener("fc:convert-confirmed", handleConvertConfirmed);
      doc.removeEventListener("fc:convert-cancelled", handleConvertCancelled);
      unsubscribe();
      chat.destroy();
      layout.destroy();
    },
  };
}
