import type { Site } from "./schema.js";

export type PlanTier = "trial" | "paid";

export interface AccountRecord {
  id: string;
  email: string;
  display_name: string | null;
  plan_tier: PlanTier;
  created_at: number;
  updated_at: number;
}

export interface SiteRecord {
  id: string;
  account_id: string;
  slug: string;
  display_name: string;
  draft_definition: string;
  published_definition: string | null;
  published_at: number | null;
  published_revision_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface SiteRecordParsed extends Omit<SiteRecord, "draft_definition" | "published_definition"> {
  draft_definition: Site;
  published_definition: Site | null;
}

export interface RevisionRecord {
  id: string;
  site_id: string;
  definition: string;
  published_at: number;
  published_by: string | null;
  description: string | null;
  created_at: number;
}

export interface RevisionRecordParsed extends Omit<RevisionRecord, "definition"> {
  definition: Site;
}
