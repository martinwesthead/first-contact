// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { bootBuilder } from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { MemoryStorage } from "./_helpers_REQ-8_storage.js";

const WORKING_SITE_KEY = "1stcontact_builder_site_v1";

describe("UAT AC-672: preview panel Reset button confirms, clears localStorage, and reloads", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("test_UAT_AC672_preview_reset_button_confirms_clears_storage_reloads", () => {
    // --- Arrange: boot the builder with injected resetPrompt / reloadPage /
    // storageKey test doubles, exactly as the AC verification prescribes. ---
    const storage = new MemoryStorage();
    storage.setItem(WORKING_SITE_KEY, JSON.stringify({ stale: true }));
    const removeItemSpy = vi.spyOn(storage, "removeItem");
    const reloadPage = vi.fn();
    const resetPrompt = vi.fn<(message: string) => boolean>();

    // First boot: the operator confirms the reset (resetPrompt -> true).
    resetPrompt.mockReturnValue(true);
    const confirmBoot = bootBuilder({
      root: document.body,
      initialSite: load1stContactSite(),
      storage,
      storageKey: WORKING_SITE_KEY,
      resetPrompt,
      reloadPage,
    });

    // The preview toolbar must carry the Reset button.
    const resetBtn = document.body.querySelector<HTMLButtonElement>(
      "[data-fc-preview-reset]",
    );
    expect(resetBtn).not.toBeNull();

    // --- Act + Assert (confirm path): clicking with resetPrompt -> true must
    // remove the working-site key and trigger a reload. ---
    resetBtn!.click();

    expect(resetPrompt).toHaveBeenCalledTimes(1);
    expect(removeItemSpy).toHaveBeenCalledWith(WORKING_SITE_KEY);
    expect(storage.getItem(WORKING_SITE_KEY)).toBeNull();
    expect(reloadPage).toHaveBeenCalledTimes(1);

    confirmBoot.destroy();
    document.body.innerHTML = "";
    removeItemSpy.mockClear();
    reloadPage.mockClear();
    resetPrompt.mockClear();

    // --- Act + Assert (cancel path): clicking with resetPrompt -> false must
    // leave the persisted key intact and never reload. ---
    resetPrompt.mockReturnValue(false);
    const cancelStorage = new MemoryStorage();
    const cancelRemoveSpy = vi.spyOn(cancelStorage, "removeItem");
    const cancelBoot = bootBuilder({
      root: document.body,
      initialSite: load1stContactSite(),
      storage: cancelStorage,
      storageKey: WORKING_SITE_KEY,
      resetPrompt,
      reloadPage,
    });

    // Persist a real working-site entry so we can prove it survives a cancel.
    cancelBoot.store.setSiteDefinition(
      cancelBoot.store.getState().siteDefinition,
    );
    const persistedBefore = cancelStorage.getItem(WORKING_SITE_KEY);
    expect(persistedBefore).not.toBeNull();

    const cancelBtn = document.body.querySelector<HTMLButtonElement>(
      "[data-fc-preview-reset]",
    );
    cancelBtn!.click();

    expect(resetPrompt).toHaveBeenCalledTimes(1);
    expect(cancelRemoveSpy).not.toHaveBeenCalled();
    expect(cancelStorage.getItem(WORKING_SITE_KEY)).toBe(persistedBefore);
    expect(reloadPage).not.toHaveBeenCalled();

    cancelBoot.destroy();
  });
});
