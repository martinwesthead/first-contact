// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  bootBuilder,
  clearToolResultRenderers,
  getRegisteredToolResultRenderer,
} from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { MemoryStorage } from "./_helpers_REQ-8_storage.js";

describe("UAT FC BUG-10: bootBuilder wires the TranscribeProgress chat-card renderer", () => {
  afterEach(() => {
    clearToolResultRenderers();
    document.body.innerHTML = "";
  });

  it("after bootBuilder runs, the 'transcribe_site_done' kind has a registered renderer", () => {
    // Reset the registry so we're proving bootBuilder is what wires it.
    clearToolResultRenderers();
    expect(getRegisteredToolResultRenderer("transcribe_site_done")).toBeUndefined();

    const { destroy } = bootBuilder({
      root: document.body,
      initialSite: load1stContactSite(),
      storage: new MemoryStorage(),
      sessionStorageFacility: new MemoryStorage(),
    });

    // After bootBuilder runs, the transcribe_site_done dispatcher key resolves
    // to the TranscribeProgress card renderer — so a successful convert's tool
    // result lands as the stages/assets/failures card rather than the plain
    // fallback summary.
    expect(
      getRegisteredToolResultRenderer("transcribe_site_done"),
    ).toBeDefined();

    // And the digest report (analyze_page output) is still wired.
    expect(
      getRegisteredToolResultRenderer("reference_digest"),
    ).toBeDefined();

    destroy();
  });
});
