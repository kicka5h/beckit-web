import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDirectoryStore } from "./directory-store.ts";
import type { ObjectStore } from "./object-store.ts";

describe("createDirectoryStore", () => {
  let root: string;
  let store: ObjectStore;
  const data = new Uint8Array([7, 8, 9]);

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "beckit-store-"));
    store = createDirectoryStore(root);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("writes, reads and removes objects, nested by the slashes in their names", async () => {
    await store.write("docs/abc/snapshot/1", data);
    expect(await store.read("docs/abc/snapshot/1")).toEqual(data);
    expect(await readdir(join(root, "docs", "abc"))).toEqual(["snapshot"]);
    await store.remove("docs/abc/snapshot/1");
    expect(await store.read("docs/abc/snapshot/1")).toBeUndefined();
  });

  it("lists objects by prefix in name order, and nothing before the first write", async () => {
    expect(await store.list("docs/")).toEqual([]);
    await store.write("docs/b/1", data);
    await store.write("docs/a/1", data);
    await store.write("users/u.json", data);
    expect(await store.list("docs/")).toEqual(["docs/a/1", "docs/b/1"]);
  });

  it("overwrites an object whole", async () => {
    await store.write("users/u.json", data);
    await store.write("users/u.json", new Uint8Array([1]));
    expect(await store.read("users/u.json")).toEqual(new Uint8Array([1]));
    expect(await readdir(join(root, "users"))).toEqual(["u.json"]);
  });

  it("refuses a name that would land outside its directory", async () => {
    await expect(store.write("../escape", data)).rejects.toThrow(/escapes/);
    await expect(store.read("docs/../../escape")).rejects.toThrow(/escapes/);
  });
});
