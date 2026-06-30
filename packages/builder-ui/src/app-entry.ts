/**
 * REQ-17: SPA entry for the app shell (app.html). Reads the active site + tab
 * from the shell root element (stamped by the control-app Worker via
 * HTMLRewriter), mounts the app shell, and registers the available tabs.
 *
 * The Builder tab docks the existing chat+preview builder into the shell's
 * content area + chat panel. Settings and Assets are placeholder tabs in this
 * REQ — their real content lands in REQ-UI-SETTINGS and REQ-16. Revisions and
 * Leads remain disabled slots until their REQs register factories.
 *
 * Bundled by apps/control-app/scripts/build-builder-bundle.mjs to
 * apps/control-app/public/_assets/app.js.
 */
import type { Site } from "@gendev/site-schema";
import { createAppShell } from "./components/app-shell.js";
import { createAssetsTab } from "./components/assets-tab.js";
import { bootBuilder } from "./main.js";

const root = document.getElementById("fc-app-root");
if (!root) {
  throw new Error("missing #fc-app-root mount point");
}

const siteName = root.dataset.site ?? "1stcontact";
const initialTab = root.dataset.tab ?? "builder";

// REQ-25: the DB seed convention is `site_<slug>`; the chat-session FK needs
// the DB id while the URL carries the slug.
const siteId = `site_${siteName}`;

function placeholderTab(label: string) {
  return (content: HTMLElement, chatSlot: HTMLElement): void => {
    const note = document.createElement("div");
    note.className = "fc-app__placeholder";
    note.textContent = `${label} — coming soon`;
    content.appendChild(note);
    const chatNote = document.createElement("div");
    chatNote.className = "fc-app__placeholder";
    chatNote.textContent = `${label} chat`;
    chatSlot.appendChild(chatNote);
  };
}

void (async () => {
  const resp = await fetch(`/starter-sites/${encodeURIComponent(siteName)}.json`);
  if (!resp.ok) {
    root.innerHTML = `<p>Could not load site '${siteName}' (HTTP ${resp.status}).</p>`;
    return;
  }
  const site = (await resp.json()) as Site;

  const shell = createAppShell(root, {
    siteId: siteName,
    siteDisplayName: siteName,
    initialTab,
  });

  shell.registerTab("builder", {
    label: "Builder",
    defaultChatOpen: true,
    factory: (content, chatSlot) => {
      const handle = bootBuilder({
        root: content,
        initialSite: site,
        siteId,
        previewHost: content,
        chatHost: chatSlot,
      });
      return { destroy: handle.destroy };
    },
  });

  // Settings is still a placeholder (content arrives in REQ-UI-SETTINGS).
  shell.registerTab("settings", {
    label: "Settings",
    defaultChatOpen: false,
    factory: placeholderTab("Settings"),
  });
  // REQ-16: the Assets tab content. Mounts into the shell's content area; the
  // chat panel is shell-level so the factory ignores chatSlot. Panel width
  // persists in localStorage (key 1stcontact_assets_panel_v1).
  shell.registerTab("assets", {
    label: "Assets",
    defaultChatOpen: true,
    factory: (content) => {
      const handle = createAssetsTab(content, { storage: localStorage });
      return { destroy: handle.destroy };
    },
  });

  shell.activateTab(initialTab, { push: false });
})();
