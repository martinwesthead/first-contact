import type { Site } from "@gendev/site-schema";
import { defaultThemeTokens } from "@gendev/framework/tokens";

export interface EmptyScaffoldArgs {
  readonly businessName?: string;
}

/**
 * Construct the canonical empty-draft scaffold used by the convert flow before
 * AI reconstruction (REQ-34): one empty home page, default theme tokens, the
 * `in-page-anchors` nav pattern with no entries, and `config.businessName`
 * seeded from the source site title.
 *
 * The scaffold is intentionally minimal — every module / page / theme override
 * the AI emits after `transcribe_site` lands on this baseline rather than on
 * top of the operator's previous draft (which used to produce a contamination
 * mix of source content, 1stcontact starter modules, and AI paraphrases).
 */
export function buildEmptyScaffold(args: EmptyScaffoldArgs = {}): Site {
  const businessName =
    typeof args.businessName === "string" && args.businessName.trim().length > 0
      ? args.businessName.trim()
      : "Untitled";
  return {
    config: { businessName },
    theme: structuredClone(defaultThemeTokens),
    nav: { pattern: "in-page-anchors", entries: [] },
    pages: [
      {
        id: "home",
        slug: "/",
        title: businessName,
        modules: [],
      },
    ],
  };
}
