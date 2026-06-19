import type { Site } from "@1stcontact/site-schema";
import { buildFrameworkCatalog } from "./catalog.js";
import { BuilderStore, DEFAULT_STORAGE_KEY } from "./store.js";
import { createBuilderLayout } from "./components/builder-layout.js";
import { createChatPanel } from "./components/chat-panel.js";
import { createPreviewPanel } from "./components/preview-panel.js";
import { registerDigestReport } from "./components/digest-report.js";
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
  registerDigestReport();
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
      });
    },
  });

  const unsubscribe = store.subscribe((state) => {
    preview.render(state.siteDefinition);
  });
  preview.render(store.getState().siteDefinition);

  return {
    store,
    destroy: () => {
      unsubscribe();
      chat.destroy();
      layout.destroy();
    },
  };
}
