import type { Site } from "@gendev/site-schema";
import siteJson from "../sites/1stcontact/site.json" with { type: "json" };

/**
 * The canonical 1stcontact starter site — the same JSON the control-app
 * bundles. Deep-cloned per call so tests can mutate freely.
 */
export function load1stContactSite(): Site {
  return structuredClone(siteJson) as unknown as Site;
}
