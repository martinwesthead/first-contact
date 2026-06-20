import { analyzePageHandler } from "./analyze-page.js";
import { readTranscriptionDigestHandler } from "./read-transcription-digest.js";
import { transcribeSiteHandler } from "./transcribe-site.js";
import { writeTextAssetHandler } from "./write-text-asset.js";
import type { ChatHandlerEnv } from "../chat.js";
import type { SseEvent } from "./events.js";
import { type ActionCategory, type PlanTier, type Session, tierPermits } from "./types.js";

export interface ToolSpec {
  readonly name: string;
  readonly description: string;
  readonly input_schema: object;
}

export type ActionResult =
  | { readonly status: "ok"; readonly payload?: Record<string, unknown> }
  | { readonly status: "failed"; readonly error: string }
  | { readonly status: "precondition_failed"; readonly error: string };

export interface ActionContext {
  readonly session: Session;
  readonly env: ChatHandlerEnv;
  readonly emit: (event: SseEvent) => void;
  /**
   * Current draft site definition snapshot. Read-only — system action handlers
   * MUST NOT mutate it. Used by read tools (e.g. get_site_definition) so the
   * AI can verify canonical state without going through the client.
   * `null` when the handler is invoked outside the chat dispatch path (e.g.
   * the direct /api/operator/<action> POST route, which doesn't carry site
   * state).
   */
  readonly siteDefinition: unknown;
  /**
   * The operator's most recent user-role message in this turn. Populated by
   * the chat handler from request.history; `null` for the direct
   * /api/operator/<action> POST route. Used by safety-gated tools
   * (e.g. analyze_page) to verify operator intent without a KV round-trip:
   * `operatorMessageImpliesIntent(ctx.operatorLastMessage)` is sufficient
   * proof when the URL was pasted in the same turn (REQ-20 §intent token).
   */
  readonly operatorLastMessage: string | null;
}

export type ActionHandler = (
  input: Record<string, unknown>,
  ctx: ActionContext,
) => Promise<ActionResult>;

export interface OperatorActionSpec {
  readonly name: string;
  readonly category: ActionCategory;
  readonly plan_tier: PlanTier;
  readonly ui_route: string | null;
  readonly side_effects: string;
  readonly tool_spec: ToolSpec;
  // Only set when category === 'system_action'. State-edit tools execute
  // client-side via the builder-ui validator (REQ-8 contract preserved).
  readonly handler?: ActionHandler;
}

const STATE_EDIT_ACTIONS: ReadonlyArray<OperatorActionSpec> = [
  {
    name: "set_module_content",
    category: "state_edit",
    plan_tier: "trial",
    ui_route: null,
    side_effects: "Updates a single content field on an existing module instance.",
    tool_spec: {
      name: "set_module_content",
      description:
        "Update a single content field on an existing module instance. Use for changing text, images, links etc.",
      input_schema: {
        type: "object",
        properties: {
          instance_id: { type: "string" },
          field: { type: "string" },
          value: {},
        },
        required: ["instance_id", "field", "value"],
      },
    },
  },
  {
    name: "set_module_dial",
    category: "state_edit",
    plan_tier: "trial",
    ui_route: null,
    side_effects: "Sets a dial (finite-enum visual property) on a module instance.",
    tool_spec: {
      name: "set_module_dial",
      description:
        "Set a dial (finite-enum visual property) on a module instance. Value MUST be in the module's declared dial enumeration.",
      input_schema: {
        type: "object",
        properties: {
          instance_id: { type: "string" },
          dial: { type: "string" },
          value: { type: "string" },
        },
        required: ["instance_id", "dial", "value"],
      },
    },
  },
  {
    name: "set_module_variant",
    category: "state_edit",
    plan_tier: "trial",
    ui_route: null,
    side_effects: "Sets the variant of a module instance.",
    tool_spec: {
      name: "set_module_variant",
      description:
        "Set the variant of a module instance. Value MUST be in the module's declared variants list.",
      input_schema: {
        type: "object",
        properties: {
          instance_id: { type: "string" },
          variant: { type: "string" },
        },
        required: ["instance_id", "variant"],
      },
    },
  },
  {
    name: "add_module",
    category: "state_edit",
    plan_tier: "trial",
    ui_route: null,
    side_effects: "Inserts a new module instance into a page.",
    tool_spec: {
      name: "add_module",
      description:
        "Insert a new module instance into a page. Optionally insert after a specific existing module.",
      input_schema: {
        type: "object",
        properties: {
          page_id: { type: "string" },
          type: { type: "string" },
          version: { type: "number" },
          after_instance_id: { type: "string" },
          variant: { type: "string" },
          dials: { type: "object" },
          content: { type: "object" },
          id: { type: "string" },
        },
        required: ["page_id", "type", "version"],
      },
    },
  },
  {
    name: "remove_module",
    category: "state_edit",
    plan_tier: "trial",
    ui_route: null,
    side_effects: "Removes a module instance from its page.",
    tool_spec: {
      name: "remove_module",
      description: "Remove a module instance by id.",
      input_schema: {
        type: "object",
        properties: { instance_id: { type: "string" } },
        required: ["instance_id"],
      },
    },
  },
  {
    name: "reorder_modules",
    category: "state_edit",
    plan_tier: "trial",
    ui_route: null,
    side_effects: "Reorders all modules on a page.",
    tool_spec: {
      name: "reorder_modules",
      description:
        "Reorder all modules on a page. instance_ids must list every module on the page exactly once in the desired order.",
      input_schema: {
        type: "object",
        properties: {
          page_id: { type: "string" },
          instance_ids: { type: "array", items: { type: "string" } },
        },
        required: ["page_id", "instance_ids"],
      },
    },
  },
  {
    name: "set_theme_token",
    category: "state_edit",
    plan_tier: "trial",
    ui_route: null,
    side_effects: "Sets a site-wide theme token.",
    tool_spec: {
      name: "set_theme_token",
      description:
        "Set a site-wide theme token. Name must be in the catalog's themeTokenNames list (e.g. 'palette.primary').",
      input_schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          value: { type: "string" },
        },
        required: ["name", "value"],
      },
    },
  },
  {
    name: "set_site_config",
    category: "state_edit",
    plan_tier: "trial",
    ui_route: null,
    side_effects: "Sets a single site config field.",
    tool_spec: {
      name: "set_site_config",
      description:
        "Set a single site config field (e.g. 'businessName', 'contact.email').",
      input_schema: {
        type: "object",
        properties: {
          field: { type: "string" },
          value: {},
        },
        required: ["field", "value"],
      },
    },
  },
  {
    name: "add_page",
    category: "state_edit",
    plan_tier: "trial",
    ui_route: null,
    side_effects:
      "Inserts a new page into the site with the given slug and title. Empty modules.",
    tool_spec: {
      name: "add_page",
      description:
        "Add a new page. 'slug' is a bare segment ('menu', 'about-us'); the page is stored at '/{slug}'. Optionally pass 'after_slug' (the canonical stored slug of an existing page like '/' or '/menu') to control insertion order.",
      input_schema: {
        type: "object",
        properties: {
          slug: { type: "string" },
          title: { type: "string" },
          after_slug: { type: "string" },
        },
        required: ["slug", "title"],
      },
    },
  },
  {
    name: "remove_page",
    category: "state_edit",
    plan_tier: "trial",
    ui_route: null,
    side_effects:
      "Removes a page from the site. Strips nav entries pointing at the removed page. Fails on the only remaining page.",
    tool_spec: {
      name: "remove_page",
      description:
        "Remove a page by slug. The site must retain at least one page; nav entries pointing at the removed page are stripped atomically.",
      input_schema: {
        type: "object",
        properties: {
          slug: { type: "string" },
        },
        required: ["slug"],
      },
    },
  },
  {
    name: "reorder_pages",
    category: "state_edit",
    plan_tier: "trial",
    ui_route: null,
    side_effects: "Reorders all pages in the site.",
    tool_spec: {
      name: "reorder_pages",
      description:
        "Reorder all pages. 'slugs' must list every page slug exactly once in the desired order (canonical form: '/', '/menu', etc.).",
      input_schema: {
        type: "object",
        properties: {
          slugs: { type: "array", items: { type: "string" } },
        },
        required: ["slugs"],
      },
    },
  },
  {
    name: "set_page_metadata",
    category: "state_edit",
    plan_tier: "trial",
    ui_route: null,
    side_effects:
      "Patches a page's title, slug (rename), or seoMeta. Page id is preserved across slug renames so nav references survive.",
    tool_spec: {
      name: "set_page_metadata",
      description:
        "Update a page's metadata. Identify the page by 'slug' (canonical '/', '/menu', or bare 'menu'). At least one of 'title', 'new_slug', 'seoMeta' must be provided. 'new_slug' must be a bare segment (e.g. 'about'); the page id stays the same so existing nav references still resolve.",
      input_schema: {
        type: "object",
        properties: {
          slug: { type: "string" },
          title: { type: "string" },
          new_slug: { type: "string" },
          seoMeta: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              ogImage: { type: "string" },
            },
          },
        },
        required: ["slug"],
      },
    },
  },
  {
    name: "set_nav_pattern",
    category: "state_edit",
    plan_tier: "trial",
    ui_route: null,
    side_effects: "Sets the site-wide nav pattern.",
    tool_spec: {
      name: "set_nav_pattern",
      description:
        "Set the site-wide nav pattern. Allowed values: 'in-page-anchors', 'top-tabs', 'top-tabs-dropdown', 'hamburger', 'footer-only'. v1 framework renders 'in-page-anchors' and 'top-tabs' best; the others validate but may render with degraded fidelity.",
      input_schema: {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            enum: [
              "in-page-anchors",
              "top-tabs",
              "top-tabs-dropdown",
              "hamburger",
              "footer-only",
            ],
          },
        },
        required: ["pattern"],
      },
    },
  },
  {
    name: "set_nav_entries",
    category: "state_edit",
    plan_tier: "trial",
    ui_route: null,
    side_effects:
      "Wholesale-replaces site.nav.entries. Each entry's target is validated to resolve (page id / module id) and labels must be unique.",
    tool_spec: {
      name: "set_nav_entries",
      description:
        "Replace the nav entries wholesale. Each entry is { label, target }. target is one of: { kind: 'page', pageId } | { kind: 'anchor', pageId, moduleId } | { kind: 'url', href }. Page and anchor targets must reference existing page / module ids. Labels must be unique.",
      input_schema: {
        type: "object",
        properties: {
          entries: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                target: { type: "object" },
              },
              required: ["label", "target"],
            },
          },
        },
        required: ["entries"],
      },
    },
  },
  {
    name: "duplicate_module",
    category: "state_edit",
    plan_tier: "trial",
    ui_route: null,
    side_effects:
      "Deep-clones a module instance on the same page. New id, identical type/version/variant/dials/content. AssetRefs are duplicated by reference.",
    tool_spec: {
      name: "duplicate_module",
      description:
        "Duplicate a module instance. Inserts the clone after the source by default, or after 'after_instance_id' when supplied (must be on the same page as the source). New module id is generated.",
      input_schema: {
        type: "object",
        properties: {
          instance_id: { type: "string" },
          after_instance_id: { type: "string" },
        },
        required: ["instance_id"],
      },
    },
  },
];

const publishStubHandler: ActionHandler = async (input, ctx) => {
  const note =
    typeof input.note === "string" ? (input.note as string) : "publish stub";
  const payload = {
    action: "publish_stub",
    status: "published" as const,
    note,
    site_url: `https://example.invalid/preview/${ctx.session.account_id}`,
  };
  ctx.emit({ event: "action:notify", data: payload });
  return { status: "ok", payload };
};

const reportValidationRejectionHandler: ActionHandler = async (input, ctx) => {
  // Body is the structured error the client-side validator produced.
  // We re-emit on the SSE channel so any UI listeners and (next-turn) AI
  // context can pick it up. We DO NOT re-run a server-side validator here;
  // the validator of record is the FE one (REQ-8 §5.3).
  const { tool, path, expected, got, message } = input;
  const data: Record<string, unknown> = {
    ...(typeof tool === "string" ? { tool } : {}),
    ...(typeof path === "string" ? { path } : {}),
    ...(expected !== undefined ? { expected } : {}),
    ...(got !== undefined ? { got } : {}),
    ...(typeof message === "string" ? { message } : {}),
  };
  ctx.emit({ event: "validation:error", data });
  return { status: "ok", payload: data };
};

const getSiteDefinitionHandler: ActionHandler = async (_input, ctx) => {
  return {
    status: "ok",
    payload: { site_definition: ctx.siteDefinition ?? null },
  };
};

const SYSTEM_ACTIONS: ReadonlyArray<OperatorActionSpec> = [
  {
    name: "get_site_definition",
    category: "system_action",
    plan_tier: "trial",
    ui_route: null,
    side_effects:
      "Read-only. Returns the current draft site definition so the AI can verify canonical state after edits (REQ-13 §Part 1).",
    tool_spec: {
      name: "get_site_definition",
      description:
        "Read the current site definition (draft state). Use this when you need to confirm what the site looks like after a sequence of edits, or before making a change that depends on existing content/structure.",
      input_schema: {
        type: "object",
        properties: {},
      },
    },
    handler: getSiteDefinitionHandler,
  },
  {
    name: "publish_stub",
    category: "system_action",
    plan_tier: "paid",
    ui_route: null,
    side_effects:
      "Stub publish: emits an action:notify event with a placeholder site URL. Does not actually build or deploy. Replaced by REQ-11.",
    tool_spec: {
      name: "publish_stub",
      description:
        "Publish the current site to its public URL (stub: no-op v1; emits an action:notify event with a placeholder URL).",
      input_schema: {
        type: "object",
        properties: {
          note: { type: "string" },
        },
      },
    },
    handler: publishStubHandler,
  },
  {
    name: "analyze_page",
    category: "system_action",
    plan_tier: "trial",
    ui_route: null,
    side_effects:
      "Fetches the given URL via the REQ-20 safety layer, runs Layer A signal extractors (palette/typography/layout/imagery/content), runs an AI commentary pass, and returns a Reference Digest record. Result is cached in KV for 24h. The digest is attached to the chat history as a structured tool_result of kind 'reference_digest' so the builder UI can render it via the REQ-13 dispatcher.",
    tool_spec: {
      name: "analyze_page",
      description:
        "Analyze an external reference URL the operator wants to draw inspiration from (or reproduce). Returns a Reference Digest: palette, typography, layout, imagery, content tree, asset inventory, and AI commentary. Call this when the operator pastes a URL and asks for analysis or wants to base their site on a reference. Requires operator intent (URL in chat or intentToken).",
      input_schema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description:
              "Absolute http(s) URL of the page to analyze. Operator must have already expressed intent in this turn (pasted the URL or used fetch keywords) or supplied a fresh intentToken.",
          },
          intentToken: {
            type: "string",
            description:
              "Optional. A token minted by /api/chat when the operator's message implied fetch intent. Pass this through verbatim when re-invoking via the direct /api/operator endpoint.",
          },
          forceRendered: {
            type: "boolean",
            description:
              "Optional. Use only when the operator explicitly asks for a rendered analysis (e.g. 'render this page'). Forces Browser Rendering escalation even when the static-fetch signals would have been sufficient. Costs against the per-session browser budget.",
          },
        },
        required: ["url"],
      },
    },
    handler: analyzePageHandler,
  },
  {
    name: "transcribe_site",
    category: "system_action",
    plan_tier: "trial",
    ui_route: null,
    side_effects:
      "Layer B transcription: maps a Reference Digest into 1st Contact module instances + theme tokens, then mirrors referenced visual assets into R2. Destructive — replaces the current draft. Proceeds end-to-end on every invocation (Stages 1–5 with progressive-reveal SSE events). Operators recover from accidental invocations via the Reset button.",
    tool_spec: {
      name: "transcribe_site",
      description:
        "Layer B transcription — convert an analyzed reference site into a 1st Contact draft. Pass the digestId (which is the source URL the operator pasted). Applies the transcription end-to-end (screenshot preview → theme tokens → module instances → R2-mirrored assets). Cost: per-asset safeFetch + R2 writes — only call when the operator has clearly requested a conversion of the analyzed site.",
      input_schema: {
        type: "object",
        properties: {
          digestId: {
            type: "string",
            description:
              "The source URL the digest was produced for (also the FETCH_CACHE_KV lookup key).",
          },
        },
        required: ["digestId"],
      },
    },
    handler: transcribeSiteHandler,
  },
  {
    name: "read_transcription_digest",
    category: "system_action",
    plan_tier: "trial",
    ui_route: null,
    side_effects:
      "Read-only. Fetches sites/{siteId}/transcription/digest.json from ASSETS_BUCKET. Returns {kind: 'transcription_digest', digest} when the convert has completed, or {kind: 'transcription_digest_not_ready'} when no digest is present (either because transcribe_site hasn't run yet or because Stage 0 has evicted the prior one and the new write hasn't landed).",
    tool_spec: {
      name: "read_transcription_digest",
      description:
        "Read the transcription digest written by transcribe_site. Returns {kind: 'transcription_digest', digestKey, digest} on success, or {kind: 'transcription_digest_not_ready', digestKey} when no digest is currently present — poll again after transcribe_site reports done.",
      input_schema: {
        type: "object",
        properties: {
          siteId: {
            type: "string",
            description: "The site id whose digest to read (the operator's account id).",
          },
        },
        required: ["siteId"],
      },
    },
    handler: readTranscriptionDigestHandler,
  },
  {
    name: "write_text_asset",
    category: "system_action",
    plan_tier: "trial",
    ui_route: null,
    side_effects:
      "Writes a markdown text asset to R2 at sites/{siteId}/copy/{slug}.md. Used by the AI to update body copy referenced by AssetRef-text content fields when the operator asks for a rewrite. Key MUST match `sites/{siteId}/copy/{slug}.md` — keys outside that pattern are rejected. (REQ-33)",
    tool_spec: {
      name: "write_text_asset",
      description:
        "Update the markdown bytes a text-kind AssetRef points at. Pass `key` (must match `sites/{siteId}/copy/{slug}.md`) and `content` (the new markdown body). Returns { ok: true, key, bytes }. Use this when the operator asks you to rewrite body copy that lives in a `.md` file (a module content field whose value is an AssetRef with kind: 'text'); use `set_module_content` when the field is an inline string or when you need to swap the field between inline and a file reference.",
      input_schema: {
        type: "object",
        properties: {
          key: { type: "string" },
          content: { type: "string" },
        },
        required: ["key", "content"],
      },
    },
    handler: writeTextAssetHandler,
  },
  {
    name: "report_validation_rejection",
    category: "system_action",
    plan_tier: "trial",
    ui_route: null,
    side_effects:
      "Re-emits a client-side validator rejection on the SSE channel as a validation:error event. Used by the FE after applyToolCall fails so other listeners and the next AI turn can react.",
    tool_spec: {
      name: "report_validation_rejection",
      description:
        "Report a client-side validator rejection so it is surfaced as a validation:error SSE event. Body must include {tool, path, expected, got}.",
      input_schema: {
        type: "object",
        properties: {
          tool: { type: "string" },
          path: { type: "string" },
          expected: {},
          got: {},
          message: { type: "string" },
        },
        required: ["tool"],
      },
    },
    handler: reportValidationRejectionHandler,
  },
];

export const OPERATOR_ACTIONS: ReadonlyArray<OperatorActionSpec> = [
  ...STATE_EDIT_ACTIONS,
  ...SYSTEM_ACTIONS,
];

export function findAction(name: string): OperatorActionSpec | undefined {
  return OPERATOR_ACTIONS.find((a) => a.name === name);
}

export function visibleToolSpecs(planTier: PlanTier): ReadonlyArray<ToolSpec> {
  return OPERATOR_ACTIONS
    .filter((a) => tierPermits(planTier, a.plan_tier))
    .map((a) => a.tool_spec);
}

export function actionsByCategory(
  category: ActionCategory,
): ReadonlyArray<OperatorActionSpec> {
  return OPERATOR_ACTIONS.filter((a) => a.category === category);
}
