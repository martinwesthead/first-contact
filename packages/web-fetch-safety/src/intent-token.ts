export type IntentTokenEnv = {
  FETCH_RATE_KV: KVNamespace;
};

export const INTENT_TOKEN_TTL_SECONDS = 60;

type StoredIntent = {
  sessionId: string;
  accountId: string;
  expiresAt: number;
};

export type IntentVerifyResult =
  | { ok: true; sessionId: string; accountId: string }
  | { ok: false; reason: "missing_intent"; detail?: "no_token" | "expired" | "session_mismatch" };

const URL_PATTERN = /\bhttps?:\/\/[^\s)]+/i;
const FETCH_KEYWORDS =
  /\b(fetch|download|grab|crawl|scrape|screenshot|reference|inspiration|import|copy from)\b/i;

export function operatorMessageImpliesIntent(text: string): boolean {
  if (!text) return false;
  if (URL_PATTERN.test(text)) return true;
  if (FETCH_KEYWORDS.test(text)) return true;
  return false;
}

function randomToken(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback — getRandomValues exists in every modern runtime.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

export type MintArgs = {
  sessionId: string;
  accountId: string;
  clock?: () => number;
  ttlSeconds?: number;
};

export async function mintIntentToken(
  env: IntentTokenEnv,
  args: MintArgs,
): Promise<{ token: string; expiresAt: number }> {
  const clock = args.clock ?? Date.now;
  const ttl = args.ttlSeconds ?? INTENT_TOKEN_TTL_SECONDS;
  const token = randomToken();
  const expiresAt = Math.floor(clock() / 1000) + ttl;
  const payload: StoredIntent = {
    sessionId: args.sessionId,
    accountId: args.accountId,
    expiresAt,
  };
  await env.FETCH_RATE_KV.put(`intent:${token}`, JSON.stringify(payload), {
    expirationTtl: Math.max(1, ttl),
  });
  return { token, expiresAt };
}

export type VerifyArgs = {
  token: string | null | undefined;
  sessionId: string;
  clock?: () => number;
  consume?: boolean;
};

export async function verifyIntentToken(
  env: IntentTokenEnv,
  args: VerifyArgs,
): Promise<IntentVerifyResult> {
  const clock = args.clock ?? Date.now;
  if (!args.token) {
    return { ok: false, reason: "missing_intent", detail: "no_token" };
  }
  const key = `intent:${args.token}`;
  const raw = await env.FETCH_RATE_KV.get(key, "json");
  if (!raw) {
    return { ok: false, reason: "missing_intent", detail: "expired" };
  }
  const stored = raw as StoredIntent;
  const now = Math.floor(clock() / 1000);
  if (stored.expiresAt <= now) {
    await env.FETCH_RATE_KV.delete(key);
    return { ok: false, reason: "missing_intent", detail: "expired" };
  }
  if (stored.sessionId !== args.sessionId) {
    return { ok: false, reason: "missing_intent", detail: "session_mismatch" };
  }
  if (args.consume !== false) {
    await env.FETCH_RATE_KV.delete(key);
  }
  return { ok: true, sessionId: stored.sessionId, accountId: stored.accountId };
}
