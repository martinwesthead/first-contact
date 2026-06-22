/**
 * SPA entry — invoked by the static builder.html page. Reads the starter-site
 * JSON from /starter-sites/<name>.json (selected by `?site=` query param) and
 * boots the builder into <div id="fc-builder-root">.
 *
 * Bundled by apps/control-app/scripts/build-builder-bundle.mjs to
 * apps/control-app/public/_assets/builder.js.
 */
import type { Site } from "@gendev/site-schema";
import { bootBuilder } from "./main.js";

const params = new URLSearchParams(window.location.search);
const siteName = params.get("site") ?? "1stcontact";
const root = document.getElementById("fc-builder-root");
if (!root) {
  throw new Error("missing #fc-builder-root mount point");
}

void (async () => {
  const resp = await fetch(`/starter-sites/${encodeURIComponent(siteName)}.json`);
  if (!resp.ok) {
    root.innerHTML = `<p>Could not load site '${siteName}' (HTTP ${resp.status}).</p>`;
    return;
  }
  const site = (await resp.json()) as Site;
  bootBuilder({ root, initialSite: site });
})();
