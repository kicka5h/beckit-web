import { describe, expect, it } from "vitest";

import { createMemoryStore } from "./object-store.ts";
import { createObjectStorageAdapter } from "./storage-adapter.ts";

describe("createObjectStorageAdapter", () => {
  const data = new Uint8Array([1, 2, 3]);

  it("saves, loads and removes one key", async () => {
    const adapter = createObjectStorageAdapter(createMemoryStore());
    await adapter.save(["doc", "snapshot", "abc"], data);
    expect(await adapter.load(["doc", "snapshot", "abc"])).toEqual(data);
    await adapter.remove(["doc", "snapshot", "abc"]);
    expect(await adapter.load(["doc", "snapshot", "abc"])).toBeUndefined();
  });

  it("loads and removes every key under a prefix, and nothing beside it", async () => {
    const adapter = createObjectStorageAdapter(createMemoryStore());
    await adapter.save(["doc", "incremental", "1"], data);
    await adapter.save(["doc", "incremental", "2"], data);
    await adapter.save(["doc-other", "incremental", "1"], data);
    const chunks = await adapter.loadRange(["doc"]);
    expect(chunks.map(({ key }) => key)).toEqual([
      ["doc", "incremental", "1"],
      ["doc", "incremental", "2"],
    ]);
    await adapter.removeRange(["doc"]);
    expect(await adapter.loadRange(["doc"])).toEqual([]);
    expect(await adapter.loadRange(["doc-other"])).toHaveLength(1);
  });

  it("keeps keys apart even when a part contains a slash", async () => {
    const adapter = createObjectStorageAdapter(createMemoryStore());
    await adapter.save(["a/b", "c"], data);
    expect(await adapter.loadRange(["a"])).toEqual([]);
    expect((await adapter.loadRange(["a/b"]))[0]?.key).toEqual(["a/b", "c"]);
  });
});
