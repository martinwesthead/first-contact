import type { KVNamespace } from "@cloudflare/workers-types";

export type SsrfDetail =
  | "private_ip"
  | "loopback"
  | "link_local"
  | "metadata_host"
  | "broadcast"
  | "unspecified";

export type TargetRejectReason =
  | "private_ip"
  | "disallowed_scheme"
  | "invalid_url"
  | "missing_host";

export type TargetCheck =
  | { ok: true; url: URL }
  | { ok: false; reason: TargetRejectReason; detail?: SsrfDetail | string };

export type FetchFailureReason =
  | TargetRejectReason
  | "too_many_redirects"
  | "body_too_large"
  | "network_error"
  | "requires_robots_override"
  | "missing_intent"
  | "rate_limited"
  | "budget_exhausted";

export type SafeFetchSuccess = {
  ok: true;
  status: number;
  headers: Headers;
  body: Uint8Array;
  finalUrl: string;
  redirects: number;
  cacheStatus: "HIT" | "MISS" | "BYPASS";
};

export type SafeFetchFailure = {
  ok: false;
  reason: FetchFailureReason;
  detail?: string;
  retryAfterSeconds?: number;
  origin?: string;
};

export type SafeFetchResult = SafeFetchSuccess | SafeFetchFailure;

export type RobotsCheck = { allowed: true } | { allowed: false; origin: string };

export type ValidateTargetOptions = {
  allowHttpForOrigin?: string;
};

export interface SafetyEnv {
  FETCH_CACHE_KV: KVNamespace;
  FETCH_ROBOTS_KV: KVNamespace;
}
