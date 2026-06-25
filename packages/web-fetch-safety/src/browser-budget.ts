import type { KVNamespace } from "@cloudflare/workers-types";

export type BrowserBudgetConfig = {
  sessionMaxSeconds: number;
  dayMaxSeconds: number;
};

// BUG-17: defaults are effectively infinite (1e9 seconds ≈ 31.7 years) so the
// cap never trips for production callers. Tighten per-call via the `config`
// override on chargeBrowserBudget / checkBrowserBudget if a future caller
// needs a real ceiling — the enforcement machinery is unchanged.
export const DEFAULT_BROWSER_BUDGET: BrowserBudgetConfig = {
  sessionMaxSeconds: 1_000_000_000,
  dayMaxSeconds: 1_000_000_000,
};

export type BrowserBudgetEnv = {
  BROWSER_BUDGET_KV: KVNamespace;
};

export type BudgetDecision =
  | { ok: true; remaining: { session: number; day: number } }
  | { ok: false; reason: "budget_exhausted"; exhausted: "session" | "day"; remainingSeconds: 0 };

type Counter = { spentSeconds: number; resetsAt: number };

function nowSeconds(clock: () => number): number {
  return Math.floor(clock() / 1000);
}

function utcDayResetSeconds(now: number): number {
  const dayInSec = 86400;
  const dayStart = now - (now % dayInSec);
  return dayStart + dayInSec;
}

async function readCounter(
  kv: KVNamespace,
  key: string,
  now: number,
  resetsAt: number,
): Promise<Counter> {
  const raw = await kv.get(key, "json");
  if (!raw) return { spentSeconds: 0, resetsAt };
  const c = raw as Counter;
  if (c.resetsAt <= now) return { spentSeconds: 0, resetsAt };
  return c;
}

async function writeCounter(
  kv: KVNamespace,
  key: string,
  counter: Counter,
  now: number,
): Promise<void> {
  const ttl = Math.max(1, counter.resetsAt - now + 5);
  await kv.put(key, JSON.stringify(counter), { expirationTtl: ttl });
}

export type ChargeArgs = {
  accountId: string;
  sessionId: string;
  costSeconds: number;
  clock?: () => number;
  config?: Partial<BrowserBudgetConfig>;
  sessionResetSeconds?: number;
};

export async function checkBrowserBudget(
  env: BrowserBudgetEnv,
  args: Omit<ChargeArgs, "costSeconds">,
): Promise<BudgetDecision> {
  return chargeBrowserBudget(env, { ...args, costSeconds: 0 });
}

export async function chargeBrowserBudget(
  env: BrowserBudgetEnv,
  args: ChargeArgs,
): Promise<BudgetDecision> {
  const clock = args.clock ?? Date.now;
  const config = { ...DEFAULT_BROWSER_BUDGET, ...args.config };
  const sessionResetSeconds = args.sessionResetSeconds ?? 24 * 60 * 60;
  const now = nowSeconds(clock);
  const dayReset = utcDayResetSeconds(now);

  const sessionKey = `bb:session:${args.sessionId}`;
  const dayKey = `bb:day:${args.accountId}`;

  const [sessionC, dayC] = await Promise.all([
    readCounter(env.BROWSER_BUDGET_KV, sessionKey, now, now + sessionResetSeconds),
    readCounter(env.BROWSER_BUDGET_KV, dayKey, now, dayReset),
  ]);

  if (sessionC.spentSeconds >= config.sessionMaxSeconds) {
    return { ok: false, reason: "budget_exhausted", exhausted: "session", remainingSeconds: 0 };
  }
  if (dayC.spentSeconds >= config.dayMaxSeconds) {
    return { ok: false, reason: "budget_exhausted", exhausted: "day", remainingSeconds: 0 };
  }

  if (args.costSeconds > 0) {
    sessionC.spentSeconds += args.costSeconds;
    dayC.spentSeconds += args.costSeconds;
    await Promise.all([
      writeCounter(env.BROWSER_BUDGET_KV, sessionKey, sessionC, now),
      writeCounter(env.BROWSER_BUDGET_KV, dayKey, dayC, now),
    ]);
  }

  return {
    ok: true,
    remaining: {
      session: Math.max(0, config.sessionMaxSeconds - sessionC.spentSeconds),
      day: Math.max(0, config.dayMaxSeconds - dayC.spentSeconds),
    },
  };
}
