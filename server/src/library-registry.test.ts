import { generateAutomergeUrl } from "@automerge/automerge-repo";
import { describe, expect, it } from "vitest";

import { claimLibraryUrl, readLibraryUrl } from "./library-registry.ts";
import { createMemoryStore } from "./object-store.ts";

describe("claimLibraryUrl", () => {
  it("registers the first device's library and hands it to every later device", async () => {
    const store = createMemoryStore();
    const first = generateAutomergeUrl();
    expect(await readLibraryUrl(store, "uid-1")).toBeUndefined();
    expect(await claimLibraryUrl(store, "uid-1", first)).toBe(first);
    expect(await claimLibraryUrl(store, "uid-1", generateAutomergeUrl())).toBe(first);
    expect(await readLibraryUrl(store, "uid-1")).toBe(first);
  });

  it("keeps each writer's library apart", async () => {
    const store = createMemoryStore();
    await claimLibraryUrl(store, "uid-1", generateAutomergeUrl());
    expect(await readLibraryUrl(store, "uid-2")).toBeUndefined();
  });

  it("ignores a record that holds no library address", async () => {
    const store = createMemoryStore();
    await store.write("users/uid-1.json", new TextEncoder().encode('{"libraryUrl":"nope"}'));
    expect(await readLibraryUrl(store, "uid-1")).toBeUndefined();
  });
});
