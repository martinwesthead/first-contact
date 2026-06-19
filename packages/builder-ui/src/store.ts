import type { Site } from "@1stcontact/site-schema";
import { validateSite } from "@1stcontact/site-schema";

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

export interface BuilderState {
  readonly siteDefinition: Site;
  readonly chatHistory: ReadonlyArray<ChatMessage>;
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

  constructor(initial: BuilderState, options: BuilderStoreOptions = {}) {
    const persisted = options.storage
      ? loadPersisted(options.storage, options.storageKey ?? DEFAULT_STORAGE_KEY)
      : null;
    this.state = persisted
      ? { siteDefinition: persisted, chatHistory: initial.chatHistory }
      : initial;
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
