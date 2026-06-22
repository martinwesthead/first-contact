import type { Site } from "@gendev/site-schema";
import { validateSite } from "@gendev/site-schema";

export type ChatToolResultRecord =
  | {
      readonly ok: true;
      readonly applied: {
        readonly tool: string;
        readonly args: Record<string, unknown>;
        readonly summary: string;
        readonly data?: unknown;
        readonly kind?: string;
      };
    }
  | {
      readonly ok: false;
      readonly error: { readonly tool: string; readonly validation: unknown };
    };

export interface ChatToolCallRecord {
  readonly name: string;
  readonly input: Record<string, unknown>;
  readonly accepted: boolean;
  readonly error?: string;
  readonly result?: ChatToolResultRecord;
}

export interface ChatMessage {
  readonly role: "user" | "assistant" | "system";
  readonly content: string;
  readonly toolCalls?: ReadonlyArray<ChatToolCallRecord>;
}

/**
 * REQ-37: a tool call the AI attempted in the previous turn that the
 * client-side validator (state_edit) or server-side handler (system_action)
 * rejected. The chat-driver accumulates these between turns; the chat panel
 * surfaces them in a dismissable banner; the driver prepends a synthetic
 * `system` message describing them on the next outbound request so the AI
 * can retry without the operator restating the failure.
 */
export interface PendingToolFailure {
  readonly name: string;
  readonly input: Record<string, unknown>;
  readonly error: string;
}

export interface BuilderState {
  readonly siteDefinition: Site;
  /**
   * REQ-25: messages currently rendered. With server-resident history this
   * is the tail of the active session plus any optimistic in-flight bubble
   * — not the full conversation. Infinite scroll prepends older pages.
   */
  readonly chatHistory: ReadonlyArray<ChatMessage>;
  readonly pendingToolFailures: ReadonlyArray<PendingToolFailure>;
  /**
   * REQ-25: server-side id of the chat session the operator is talking to.
   * Null until the boot routine has established a session — the chat-driver
   * refuses to run a turn while it's null.
   */
  readonly activeSessionId: string | null;
  /**
   * REQ-25: lowest `ord` currently loaded into chatHistory (or null when
   * empty). Used by infinite scroll as the `before=:ord` cursor.
   */
  readonly loadedFromOrd: number | null;
  /** REQ-25: true while older pages remain unfetched. */
  readonly hasMoreOlder: boolean;
}

/** Constructor input — chat-session fields default to empty/null. */
export interface BuilderStateInit {
  readonly siteDefinition: Site;
  readonly chatHistory: ReadonlyArray<ChatMessage>;
  readonly pendingToolFailures?: ReadonlyArray<PendingToolFailure>;
  readonly activeSessionId?: string | null;
  readonly loadedFromOrd?: number | null;
  readonly hasMoreOlder?: boolean;
}

export type Listener = (state: BuilderState) => void;

export const DEFAULT_STORAGE_KEY = "1stcontact_builder_site_v1";

export interface BuilderStoreOptions {
  storage?: Storage | null;
  storageKey?: string;
  /** Warn if serialised state grows past this many bytes (DOC-8 risk note). */
  sizeWarningBytes?: number;
}

export class BuilderStore {
  private state: BuilderState;
  private readonly listeners = new Set<Listener>();
  private readonly storage: Storage | null;
  private readonly storageKey: string;
  private readonly sizeWarningBytes: number;
  /** Diff log of historical (site definition before patch) entries — supports per-session undo. */
  private readonly history: Site[] = [];

  constructor(initial: BuilderStateInit, options: BuilderStoreOptions = {}) {
    const persisted = options.storage
      ? loadPersisted(options.storage, options.storageKey ?? DEFAULT_STORAGE_KEY)
      : null;
    const pending = initial.pendingToolFailures ?? [];
    const baseExtras = {
      pendingToolFailures: pending,
      activeSessionId: initial.activeSessionId ?? null,
      loadedFromOrd: initial.loadedFromOrd ?? null,
      hasMoreOlder: initial.hasMoreOlder ?? false,
    } as const;
    this.state = persisted
      ? {
          siteDefinition: persisted,
          chatHistory: initial.chatHistory,
          ...baseExtras,
        }
      : {
          siteDefinition: initial.siteDefinition,
          chatHistory: initial.chatHistory,
          ...baseExtras,
        };
    this.storage = options.storage ?? null;
    this.storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
    this.sizeWarningBytes = options.sizeWarningBytes ?? 1_000_000;
  }

  getState(): BuilderState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Set the site definition. Layer 2 defensive validation per DOC-7 §6.5 — if
   * `next` does not pass the schema, the store rejects it and returns false.
   * Returns true on accept.
   */
  setSiteDefinition(next: Site): boolean {
    const result = validateSite(next);
    if (!result.ok) return false;
    this.history.push(this.state.siteDefinition);
    this.state = { ...this.state, siteDefinition: result.value };
    this.persist();
    this.emit();
    return true;
  }

  appendChatMessage(message: ChatMessage): void {
    this.state = {
      ...this.state,
      chatHistory: [...this.state.chatHistory, message],
    };
    this.emit();
  }

  /** REQ-36 G9: replace the most recently appended chat message in place.
   *  Used by the streaming driver to grow the in-flight assistant bubble as
   *  text deltas arrive without rebuilding history each token. No-ops when
   *  there is no last message. */
  updateLastChatMessage(message: ChatMessage): void {
    const history = this.state.chatHistory;
    if (history.length === 0) return;
    const next = history.slice(0, -1);
    next.push(message);
    this.state = { ...this.state, chatHistory: next };
    this.emit();
  }

  /** REQ-37: append tool failures from a completed turn so the panel and the
   *  next outbound chat request can surface them. No-op when `failures` is
   *  empty so callers can pass driver output unconditionally. */
  recordToolFailures(failures: ReadonlyArray<PendingToolFailure>): void {
    if (failures.length === 0) return;
    this.state = {
      ...this.state,
      pendingToolFailures: [...this.state.pendingToolFailures, ...failures],
    };
    this.emit();
  }

  /** REQ-37: drop all accumulated tool failures (called by the driver after
   *  reinjecting them into the next chat request, and by the panel's
   *  Dismiss control). */
  clearToolFailures(): void {
    if (this.state.pendingToolFailures.length === 0) return;
    this.state = { ...this.state, pendingToolFailures: [] };
    this.emit();
  }

  /** REQ-25: set the active session and seed its loaded tail. Resets
   *  pendingToolFailures (they belonged to the prior session). */
  setActiveSession(
    sessionId: string | null,
    init: {
      chatHistory: ReadonlyArray<ChatMessage>;
      loadedFromOrd: number | null;
      hasMoreOlder: boolean;
    } = { chatHistory: [], loadedFromOrd: null, hasMoreOlder: false },
  ): void {
    this.state = {
      ...this.state,
      activeSessionId: sessionId,
      chatHistory: init.chatHistory,
      loadedFromOrd: init.loadedFromOrd,
      hasMoreOlder: init.hasMoreOlder,
      pendingToolFailures: [],
    };
    this.emit();
  }

  /** REQ-25: prepend older messages and advance the cursor. Used by
   *  infinite scroll. */
  prependOlderMessages(
    messages: ReadonlyArray<ChatMessage>,
    newLoadedFromOrd: number,
    hasMoreOlder: boolean,
  ): void {
    if (messages.length === 0) {
      this.state = { ...this.state, hasMoreOlder };
      this.emit();
      return;
    }
    this.state = {
      ...this.state,
      chatHistory: [...messages, ...this.state.chatHistory],
      loadedFromOrd: newLoadedFromOrd,
      hasMoreOlder,
    };
    this.emit();
  }

  /** Per-session undo. Returns true if an undo was applied. */
  undo(): boolean {
    const prev = this.history.pop();
    if (!prev) return false;
    this.state = { ...this.state, siteDefinition: prev };
    this.persist();
    this.emit();
    return true;
  }

  private emit(): void {
    for (const l of this.listeners) l(this.state);
  }

  private persist(): void {
    if (!this.storage) return;
    try {
      const serialized = JSON.stringify(this.state.siteDefinition);
      if (serialized.length > this.sizeWarningBytes) {
        console.warn(
          `[builder-ui] site definition is ${serialized.length} bytes; ` +
            `exceeds ${this.sizeWarningBytes} (localStorage quota is ~5MB)`,
        );
      }
      this.storage.setItem(this.storageKey, serialized);
    } catch (err) {
      console.warn("[builder-ui] failed to persist site definition", err);
    }
  }
}

function loadPersisted(storage: Storage, key: string): Site | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    const result = validateSite(parsed);
    return result.ok ? result.value : null;
  } catch {
    return null;
  }
}
