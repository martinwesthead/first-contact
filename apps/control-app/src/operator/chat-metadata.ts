/**
 * In-memory per-chat metadata store for the convert flow.
 *
 * REQ-28 demo critical path: REQ-23 / REQ-24 (persistent chat sessions) are
 * deferred from the demo. The destructive-confirmation flag and
 * robots-override list live in memory and DO NOT survive reload — this is
 * an explicit demo trade-off. When REQ-23 lands, this module is replaced by
 * a column on `chat_sessions` and the surface narrows to a typed accessor.
 *
 * The keying is on (session_id, account_id). One operator-running-two-tabs
 * scenario sees two distinct metadata records; that matches the operator's
 * intuition that "confirm once" applies to the tab in front of them.
 */

export interface ChatMetadata {
  /** Per-chat URL set the operator confirmed conversion for. */
  readonly convertConfirmed: Set<string>;
  /** Per-chat per-origin operator-asserted "I own this site" overrides. */
  readonly robotsOverrides: Set<string>;
}

const STORE = new Map<string, ChatMetadata>();

function keyFor(args: { sessionId: string; accountId: string }): string {
  return `${args.accountId}::${args.sessionId}`;
}

function blank(): ChatMetadata {
  return { convertConfirmed: new Set(), robotsOverrides: new Set() };
}

export function getChatMetadata(args: {
  sessionId: string;
  accountId: string;
}): ChatMetadata {
  const key = keyFor(args);
  let v = STORE.get(key);
  if (!v) {
    v = blank();
    STORE.set(key, v);
  }
  return v;
}

export function markConvertConfirmed(args: {
  sessionId: string;
  accountId: string;
  url: string;
  ownsSite?: boolean;
}): void {
  const meta = getChatMetadata(args);
  meta.convertConfirmed.add(args.url);
  if (args.ownsSite) {
    try {
      const origin = new URL(args.url).origin;
      meta.robotsOverrides.add(origin);
    } catch {
      // ignore — invalid URLs never get added to robotsOverrides
    }
  }
}

export function isConvertConfirmed(args: {
  sessionId: string;
  accountId: string;
  url: string;
}): boolean {
  return getChatMetadata(args).convertConfirmed.has(args.url);
}

export function hasRobotsOverride(args: {
  sessionId: string;
  accountId: string;
  origin: string;
}): boolean {
  return getChatMetadata(args).robotsOverrides.has(args.origin);
}

/** Test-only — reset all metadata. Production callers must never call this. */
export function __resetForTests(): void {
  STORE.clear();
}
