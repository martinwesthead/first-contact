export type PlanTier = "trial" | "paid" | "enterprise";

export type ActionCategory = "state_edit" | "system_action";

export interface Session {
  readonly session_id: string | null;
  readonly account_id: string;
  readonly plan_tier: PlanTier;
}

const TIER_RANK: Record<PlanTier, number> = {
  trial: 0,
  paid: 1,
  enterprise: 2,
};

export function tierPermits(have: PlanTier, required: PlanTier): boolean {
  return TIER_RANK[have] >= TIER_RANK[required];
}

const VALID_TIERS = new Set<PlanTier>(["trial", "paid", "enterprise"]);

function isPlanTier(s: string): s is PlanTier {
  return VALID_TIERS.has(s as PlanTier);
}

export function extractSession(request: Request): Session {
  const headerSession = request.headers.get("x-session-id");
  const session_id =
    typeof headerSession === "string" && headerSession.length > 0
      ? headerSession
      : null;
  const account_id = request.headers.get("x-account-id") ?? "anonymous";
  const rawTier = request.headers.get("x-plan-tier") ?? "trial";
  const plan_tier: PlanTier = isPlanTier(rawTier) ? rawTier : "trial";
  return { session_id, account_id, plan_tier };
}
