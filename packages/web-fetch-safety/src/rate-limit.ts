export type RateLimitConfig = {
  hourMax: number;
  dayMax: number;
  burstMax: number;
  burstWindowSeconds: number;
};

export const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  hourMax: 20,
  dayMax: 100,
  burstMax: 10,
  burstWindowSeconds: 60,
};

export type RateLimitEnv = {
  FETCH_RATE_KV: KVNamespace;
};

export type RateLimitDecision =
  | { ok: true; remaining: { hour: number; day: number; burst: number } }
  | { ok: false; reason: "rate_limited"; retryAfterSeconds: number; window: "hour" | "day" | "burst" };

type Window = { count: number; resetsAt: number };

function nowSeconds(clock: () => number): number {
  return Math.floor(clock() / 1000);
}

function emptyWindow(now: number, span: number): Window {
  return { count: 0, resetsAt: now + span };
}

async function readWindow(
  kv: KVNamespace,
  key: string,
  now: number,
  span: number,
): Promise<Window> {
  const raw = await kv.get(key, "json");
  if (!raw) return emptyWindow(now, span);
  const w = raw as Window;
  if (w.resetsAt <= now) return emptyWindow(now, span);
  return w;
}

async function writeWindow(
  kv: KVNamespace,
  key: string,
  window: Window,
  now: number,
): Promise<void> {
  const ttl = Math.max(1, window.resetsAt - now + 5);
  await kv.put(key, JSON.stringify(window), { expirationTtl: ttl });
}

export type RateLimitOptions = {
  clock?: () => number;
  config?: Partial<RateLimitConfig>;
};

export async function checkRateLimit(
  env: RateLimitEnv,
  accountId: string,
  opts: RateLimitOptions = {},
): Promise<RateLimitDecision> {
  const clock = opts.clock ?? Date.now;
  const config = { ...DEFAULT_RATE_LIMITS, ...opts.config };
  const now = nowSeconds(clock);

  const hourKey = `rl:hour:${accountId}`;
  const dayKey = `rl:day:${accountId}`;
  const burstKey = `rl:burst:${accountId}`;

  const [hourW, dayW, burstW] = await Promise.all([
    readWindow(env.FETCH_RATE_KV, hourKey, now, 3600),
    readWindow(env.FETCH_RATE_KV, dayKey, now, 86400),
    readWindow(env.FETCH_RATE_KV, burstKey, now, config.burstWindowSeconds),
  ]);

  if (burstW.count >= config.burstMax) {
    return {
      ok: false,
      reason: "rate_limited",
      retryAfterSeconds: Math.max(1, burstW.resetsAt - now),
      window: "burst",
    };
  }
  if (hourW.count >= config.hourMax) {
    return {
      ok: false,
      reason: "rate_limited",
      retryAfterSeconds: Math.max(1, hourW.resetsAt - now),
      window: "hour",
    };
  }
  if (dayW.count >= config.dayMax) {
    return {
      ok: false,
      reason: "rate_limited",
      retryAfterSeconds: Math.max(1, dayW.resetsAt - now),
      window: "day",
    };
  }

  hourW.count++;
  dayW.count++;
  burstW.count++;

  await Promise.all([
    writeWindow(env.FETCH_RATE_KV, hourKey, hourW, now),
    writeWindow(env.FETCH_RATE_KV, dayKey, dayW, now),
    writeWindow(env.FETCH_RATE_KV, burstKey, burstW, now),
  ]);

  return {
    ok: true,
    remaining: {
      hour: config.hourMax - hourW.count,
      day: config.dayMax - dayW.count,
      burst: config.burstMax - burstW.count,
    },
  };
}

export async function getRateLimitState(
  env: RateLimitEnv,
  accountId: string,
  opts: RateLimitOptions = {},
): Promise<{ hour: Window; day: Window; burst: Window }> {
  const clock = opts.clock ?? Date.now;
  const config = { ...DEFAULT_RATE_LIMITS, ...opts.config };
  const now = nowSeconds(clock);
  const [hour, day, burst] = await Promise.all([
    readWindow(env.FETCH_RATE_KV, `rl:hour:${accountId}`, now, 3600),
    readWindow(env.FETCH_RATE_KV, `rl:day:${accountId}`, now, 86400),
    readWindow(env.FETCH_RATE_KV, `rl:burst:${accountId}`, now, config.burstWindowSeconds),
  ]);
  return { hour, day, burst };
}
