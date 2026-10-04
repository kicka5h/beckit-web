import type { Chunk, StorageAdapterInterface, StorageKey } from "@automerge/automerge-repo";

import type { ObjectStore } from "./object-store.ts";

/** Where documents live in the bucket, apart from anything else stored there. */
const DOCS_PREFIX = "docs/";
const SEPARATOR = "/";

function toObjectName(key: StorageKey): string {
  return DOCS_PREFIX + key.map(encodeURIComponent).join(SEPARATOR);
}

function toStorageKey(name: string): StorageKey {
  return name.slice(DOCS_PREFIX.length).split(SEPARATOR).map(decodeURIComponent);
}

async function loadChunk(store: ObjectStore, name: string): Promise<Chunk> {
  return { key: toStorageKey(name), data: await store.read(name) };
}

/**
 * Creates automerge-repo storage over object storage: each storage key is one object, its parts
 * joined by "/" and escaped, so a key prefix is an object-name prefix.
 */
export function createObjectStorageAdapter(store: ObjectStore): StorageAdapterInterface {
  async function namesUnder(prefix: StorageKey): Promise<string[]> {
    return store.list(toObjectName(prefix) + SEPARATOR);
  }
  return {
    load: (key) => store.read(toObjectName(key)),
    save: (key, data) => store.write(toObjectName(key), data),
    remove: (key) => store.remove(toObjectName(key)),
    loadRange: async (prefix) => {
      const names = await namesUnder(prefix);
      return Promise.all(names.map((name) => loadChunk(store, name)));
    },
    removeRange: async (prefix) => {
      const names = await namesUnder(prefix);
      await Promise.all(names.map((name) => store.remove(name)));
    },
  };
}
