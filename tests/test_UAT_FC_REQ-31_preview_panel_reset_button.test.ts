// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bootBuilder,
  createPreviewPanel,
  DEFAULT_STORAGE_KEY,
} from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { MemoryStorage } from "./_helpers_REQ-8_storage.js";

describe("UAT FC REQ-31: preview panel exposes a Reset button when wired", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders no Reset button when onReset is not provided", () => {
    const panel = createPreviewPanel(document.body);
    const btn = panel.root.querySelector("[data-fc-preview-reset]");
    expect(btn).toBeNull();
  });

  it("renders a Reset button when onReset is provided, and invokes the handler on click", () => {
    const onReset = vi.fn();
    const panel = createPreviewPanel(document.body, { onReset });

    const btn = panel.root.querySelector<HTMLButtonElement>(
      "[data-fc-preview-reset]",
    );
    expect(btn).not.toBeNull();
    expect(btn!.textContent).toBe("Reset");

    btn!.click();
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});

describe("UAT FC REQ-31: bootBuilder wires Reset to clear storage and reload", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("on confirm, removes the storage key and triggers reload", () => {
    const storage = new MemoryStorage();
    storage.setItem(DEFAULT_STORAGE_KEY, JSON.stringify({ stale: true }));
    const reloadPage = vi.fn();
    const resetPrompt = vi.fn().mockReturnValue(true);

    const { destroy } = bootBuilder({
      root: document.body,
      initialSite: load1stContactSite(),
      storage,
      resetPrompt,
      reloadPage,
    });

    const btn = document.body.querySelector<HTMLButtonElement>(
      "[data-fc-preview-reset]",
    );
    expect(btn).not.toBeNull();
    btn!.click();

    expect(resetPrompt).toHaveBeenCalledTimes(1);
    expect(resetPrompt.mock.calls[0]?.[0]).toMatch(/reset/i);
    expect(storage.getItem(DEFAULT_STORAGE_KEY)).toBeNull();
    expect(reloadPage).toHaveBeenCalledTimes(1);

    destroy();
  });

  it("on cancel, does not clear storage and does not reload", () => {
    const storage = new MemoryStorage();
    const initialSite = load1stContactSite();
    // bootBuilder will write the initial site into storage via the store's persist().
    // We assert that this initial value is still present after a cancelled reset.
    const reloadPage = vi.fn();
    const resetPrompt = vi.fn().mockReturnValue(false);

    const { store, destroy } = bootBuilder({
      root: document.body,
      initialSite,
      storage,
      resetPrompt,
      reloadPage,
    });

    // Trigger a persist so storage has a real entry.
    store.setSiteDefinition(store.getState().siteDefinition);
    const persistedBefore = storage.getItem(DEFAULT_STORAGE_KEY);
    expect(persistedBefore).not.toBeNull();

    const btn = document.body.querySelector<HTMLButtonElement>(
      "[data-fc-preview-reset]",
    );
    btn!.click();

    expect(resetPrompt).toHaveBeenCalledTimes(1);
    expect(storage.getItem(DEFAULT_STORAGE_KEY)).toBe(persistedBefore);
    expect(reloadPage).not.toHaveBeenCalled();

    destroy();
  });
});
