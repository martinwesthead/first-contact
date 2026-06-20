/**
 * In-memory per-chat metadata store for the convert flow.
 *
 * Holds per-(session, account) operator-asserted "I own this site" robots
 * overrides. REQ-28's destructive-confirmation flag was removed by REQ-35;
 * the robots override surface remains because the REQ-20 safety contract
 * still consults it. REQ-23 / REQ-24 (persistent chat sessions) will move
 * this onto a column of `chat_sessions` and the surface will narrow to a
 * typed accessor.
 *
 * The keying is on (session_id, account_id). One operator-running-two-tabs
 * scenario sees two distinct metadata records.
 */

export interface ChatMetadata {
  /** Per-chat per-origin operator-asserted "I own this site" overrides. */
  readonly robotsOverrides: Set<string>;
}

const STORE = new Map<string, ChatMetadata>();

function keyFor(args: { sessionId: string; accountId: string }): string {
  return `${args.accountId}::${args.sessionId}`;
}

function blank(): ChatMetadata {
  return { robotsOverrides: new Set() };
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
