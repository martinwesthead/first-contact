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

export type ChatRole = "user" | "assistant" | "system" | "tool_result";

export interface ChatSessionRecord {
  id: string;
  site_id: string;
  user_id: string | null;
  title: string | null;
  created_at: number;
  updated_at: number;
  last_message_at: number | null;
  message_count: number;
}

export interface ChatMessageToolCall {
  name: string;
  input: Record<string, unknown>;
}

export interface ChatMessageRecord {
  id: string;
  session_id: string;
  ord: number;
  role: ChatRole;
  content: string;
  tool_calls_json: string | null;
  ts: number;
}

export interface ChatMessageRecordParsed extends Omit<ChatMessageRecord, "tool_calls_json"> {
  tool_calls: ReadonlyArray<ChatMessageToolCall> | null;
}

export interface ReferenceDocTocEntry {
  section_slug: string;
  description: string;
}

export interface ReferenceDocRecord {
  slug: string;
  title: string;
  summary: string;
  toc_json: string;
  body: string;
  kind: string;
  created_at: number;
  updated_at: number;
}

export interface ReferenceDocRecordParsed extends Omit<ReferenceDocRecord, "toc_json"> {
  toc: ReadonlyArray<ReferenceDocTocEntry>;
}
