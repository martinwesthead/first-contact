// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  createAppShell,
  type AppShellHandle,
  type AppShellOptions,
} from "@gendev/builder-ui/app-shell";
import { MemoryStorage } from "./_helpers_REQ-8_storage.js";

/**
 * REQ-17: the app shell — tab registration + routing, per-(site, tab) chat
 * open/collapsed state, and the avatar dropdown. One suite per component.
 */
describe("UAT FC REQ-17: app shell", () => {
  // Shells attach window-level popstate + document click listeners; track and
  // tear them all down between tests so stale handlers don't cross-fire.
  const live: AppShellHandle[] = [];

  function mk(options: AppShellOptions): AppShellHandle {
    const shell = createAppShell(document.body, options);
    live.push(shell);
    return shell;
  }

  afterEach(() => {
    while (live.length > 0) {
      try {
        live.pop()!.destroy();
      } catch {
        // already torn down
      }
    }
    document.body.innerHTML = "";
  });

  function registerBuilderAndSettings(shell: AppShellHandle): {
    builderContent: HTMLElement;
    settingsContent: HTMLElement;
  } {
    const out = {} as {
      builderContent: HTMLElement;
      settingsContent: HTMLElement;
    };
    shell.registerTab("builder", {
      label: "Builder",
      defaultChatOpen: true,
      factory: (content) => {
        content.textContent = "BUILDER";
        out.builderContent = content;
      },
    });
    shell.registerTab("settings", {
      label: "Settings",
      defaultChatOpen: false,
      factory: (content) => {
        content.textContent = "SETTINGS";
        out.settingsContent = content;
      },
    });
    return out;
  }

  async function tick(): Promise<void> {
    // jsdom dispatches popstate on a queued task; wait a macrotask for it.
    await new Promise((r) => setTimeout(r, 20));
  }

  function tabContent(
    shell: AppShellHandle,
    tabId: string,
  ): HTMLElement | null {
    return shell.contentArea.querySelector<HTMLElement>(
      `[data-fc-tab-content="${tabId}"]`,
    );
  }

  // AC3: clicking a tab swaps content + updates the URL via pushState.
  it("swaps content and updates the URL when a tab button is clicked", () => {
    const shell = mk({ siteId: "acme", storage: new MemoryStorage() });
    registerBuilderAndSettings(shell);

    // Builder registered first → auto-activated.
    expect(shell.getActiveTabId()).toBe("builder");
    expect(tabContent(shell, "builder")!.textContent).toBe("BUILDER");
    expect(tabContent(shell, "builder")!.hidden).toBe(false);
    expect(window.location.pathname).toBe("/app/acme/builder");

    const settingsBtn = shell.tabBar.querySelector<HTMLButtonElement>(
      '[data-fc-tab="settings"]',
    )!;
    settingsBtn.click();

    expect(shell.getActiveTabId()).toBe("settings");
    expect(tabContent(shell, "settings")!.textContent).toBe("SETTINGS");
    expect(tabContent(shell, "settings")!.hidden).toBe(false);
    expect(tabContent(shell, "builder")!.hidden).toBe(true);
    expect(window.location.pathname).toBe("/app/acme/settings");
  });

  // AC4: browser back/forward navigates between tabs.
  it("restores the previous tab on history.back()", async () => {
    const shell = mk({ siteId: "acme", storage: new MemoryStorage() });
    registerBuilderAndSettings(shell);

    shell.tabBar
      .querySelector<HTMLButtonElement>('[data-fc-tab="settings"]')!
      .click();
    expect(shell.getActiveTabId()).toBe("settings");

    window.history.back();
    await tick();

    expect(shell.getActiveTabId()).toBe("builder");
    expect(window.location.pathname).toBe("/app/acme/builder");
  });

  // AC7: chat defaults — Builder open, Settings collapsed.
  it("applies per-tab chat defaults", () => {
    const shell = mk({ siteId: "acme", storage: new MemoryStorage() });
    registerBuilderAndSettings(shell);

    expect(shell.isChatOpen("builder")).toBe(true);
    expect(shell.chatPanel.hidden).toBe(false);

    shell.activateTab("settings", { push: false });
    expect(shell.isChatOpen("settings")).toBe(false);
    expect(shell.chatPanel.hidden).toBe(true);
  });

  // AC6: chat open/collapsed persists per (site, tab) across switches + reloads.
  it("persists chat toggle state per (site, tab)", () => {
    const storage = new MemoryStorage();
    const shell = mk({ siteId: "acme", storage });
    registerBuilderAndSettings(shell);

    shell.activateTab("settings", { push: false });
    expect(shell.isChatOpen("settings")).toBe(false); // default collapsed

    shell.toggleChat(); // open Settings chat
    expect(shell.isChatOpen("settings")).toBe(true);

    // Switch away and back — toggled state restored, not reset to default.
    shell.activateTab("builder", { push: true });
    shell.activateTab("settings", { push: true });
    expect(shell.isChatOpen("settings")).toBe(true);

    // A fresh shell reading the same storage sees the persisted state — proving
    // it survives a reload, not just an in-memory switch.
    const shell2 = mk({ siteId: "acme", storage });
    registerBuilderAndSettings(shell2);
    expect(shell2.isChatOpen("settings")).toBe(true);
    // Scoping check: a different site's key has no persisted entry → default.
    const other = mk({ siteId: "other", storage });
    registerBuilderAndSettings(other);
    expect(other.isChatOpen("settings")).toBe(false);
  });

  // AC5: avatar dropdown opens with three items; click-outside closes it.
  it("opens the avatar menu and closes it on outside click", () => {
    const shell = mk({ siteId: "acme", storage: new MemoryStorage() });
    registerBuilderAndSettings(shell);

    expect(shell.avatarMenu.hidden).toBe(true);

    shell.avatarButton.click();
    expect(shell.avatarMenu.hidden).toBe(false);
    const items = shell.avatarMenu.querySelectorAll("[data-fc-avatar-item]");
    expect(
      Array.from(items).map((el) => el.getAttribute("data-fc-avatar-item")),
    ).toEqual(["sites", "account", "signout"]);

    document.body.click();
    expect(shell.avatarMenu.hidden).toBe(true);
  });

  // AC9: registering an unknown tab id is a graceful no-op (no throw).
  it("ignores registration for an unknown tab id", () => {
    const shell = mk({ siteId: "acme", storage: new MemoryStorage() });
    expect(() =>
      shell.registerTab("nonexistent", {
        label: "Nope",
        defaultChatOpen: true,
        factory: () => {},
      }),
    ).not.toThrow();
    expect(shell.getActiveTabId()).toBeNull();
  });
});
