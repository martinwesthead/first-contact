import type { RobotsCheck, SafetyEnv } from "./types.js";
import { validateTarget } from "./validate-target.js";

const ROBOTS_TTL_SECONDS = 24 * 60 * 60;
const USER_AGENT = "1stcontact-bot";

type RobotsRules = {
  disallow: string[];
  allow: string[];
};

type CachedRobots = {
  fetchedAt: number;
  status: number;
  rules: RobotsRules;
};

function parseRobots(body: string): RobotsRules {
  const lines = body.split(/\r?\n/);
  let groups: { agents: string[]; rules: RobotsRules }[] = [];
  let current: { agents: string[]; rules: RobotsRules } | null = null;
  let lastWasAgent = false;
  for (const raw of lines) {
    const line = raw.split("#")[0].trim();
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: { disallow: [], allow: [] } };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if (key === "disallow" || key === "allow") {
      if (!current) {
        current = { agents: ["*"], rules: { disallow: [], allow: [] } };
        groups.push(current);
      }
      if (value === "") {
        // empty disallow means "allow all" — no rule to add
      } else if (key === "disallow") {
        current.rules.disallow.push(value);
      } else {
        current.rules.allow.push(value);
      }
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }
  const ua = USER_AGENT.toLowerCase();
  const matching = groups.find((g) => g.agents.includes(ua));
  if (matching) return matching.rules;
  const star = groups.find((g) => g.agents.includes("*"));
  return star ? star.rules : { disallow: [], allow: [] };
}

function pathMatches(rule: string, path: string): boolean {
  if (rule === "/") return true;
  // Lightweight glob: '$' = end anchor, '*' = any chars.
  if (rule.includes("*") || rule.endsWith("$")) {
    let pattern = "^";
    for (const ch of rule) {
      if (ch === "*") pattern += ".*";
      else if (ch === "$") pattern += "$";
      else pattern += ch.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    }
    if (!pattern.endsWith("$")) pattern += "";
    return new RegExp(pattern).test(path);
  }
  return path.startsWith(rule);
}

function isAllowedByRules(rules: RobotsRules, path: string): boolean {
  // Longest-match wins between allow / disallow; default allow.
  let bestAllow = -1;
  let bestDisallow = -1;
  for (const r of rules.allow) {
    if (pathMatches(r, path) && r.length > bestAllow) bestAllow = r.length;
  }
  for (const r of rules.disallow) {
    if (pathMatches(r, path) && r.length > bestDisallow) bestDisallow = r.length;
  }
  if (bestDisallow === -1) return true;
  if (bestAllow >= bestDisallow) return true;
  return false;
}

export type RobotsCheckOptions = {
  overrides?: string[];
};

export class RobotsTxtCache {
  private fetchImpl: typeof fetch;

  constructor(
    private env: Pick<SafetyEnv, "FETCH_ROBOTS_KV">,
    opts: { fetchImpl?: typeof fetch } = {},
  ) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async check(rawUrl: string, opts: RobotsCheckOptions = {}): Promise<RobotsCheck> {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return { allowed: false, origin: "" };
    }
    const origin = url.hostname.toLowerCase();
    const overrides = (opts.overrides ?? []).map((o) => o.toLowerCase());
    const rules = await this.load(url);
    const path = url.pathname + (url.search ?? "");
    const allowed = isAllowedByRules(rules, path);
    if (!allowed && overrides.includes(origin)) {
      return { allowed: true };
    }
    if (allowed) return { allowed: true };
    return { allowed: false, origin };
  }

  private async load(url: URL): Promise<RobotsRules> {
    const cacheKey = `robots:${url.protocol}//${url.host}`;
    const cached = await this.env.FETCH_ROBOTS_KV.get(cacheKey, "json");
    if (cached) {
      const entry = cached as CachedRobots;
      return entry.rules;
    }

    const robotsUrl = `${url.protocol}//${url.host}/robots.txt`;
    const check = validateTarget(robotsUrl);
    if (!check.ok) {
      // If robots URL itself is invalid (shouldn't happen for valid origin),
      // treat as no rules.
      return { disallow: [], allow: [] };
    }

    let res: Response;
    try {
      res = await this.fetchImpl(robotsUrl, {
        method: "GET",
        headers: { "user-agent": USER_AGENT },
        redirect: "follow",
      });
    } catch {
      const empty: RobotsRules = { disallow: [], allow: [] };
      await this.env.FETCH_ROBOTS_KV.put(
        cacheKey,
        JSON.stringify({ fetchedAt: 0, status: 0, rules: empty } satisfies CachedRobots),
        { expirationTtl: ROBOTS_TTL_SECONDS },
      );
      return empty;
    }

    let rules: RobotsRules;
    if (res.status === 200) {
      const body = await res.text();
      rules = parseRobots(body);
    } else {
      // 404 / 5xx — RFC: treat absent robots as "allow all".
      rules = { disallow: [], allow: [] };
    }

    await this.env.FETCH_ROBOTS_KV.put(
      cacheKey,
      JSON.stringify({ fetchedAt: 0, status: res.status, rules } satisfies CachedRobots),
      { expirationTtl: ROBOTS_TTL_SECONDS },
    );
    return rules;
  }
}
