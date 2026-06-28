/**
 * SPA entry — invoked by the static builder.html page. Reads the starter-site
 * JSON from /starter-sites/<name>.json (selected by `?site=` query param) and
 * boots the builder into <div id="fc-builder-root">.
 *
 * Bundled by apps/control-app/scripts/build-builder-bundle.mjs to
 * apps/control-app/public/_assets/builder.js.
 */
import { bootFromQuery } from "./main.js";

const root = document.getElementById("fc-builder-root");
if (!root) {
  throw new Error("missing #fc-builder-root mount point");
}

void bootFromQuery({ root, search: window.location.search });
