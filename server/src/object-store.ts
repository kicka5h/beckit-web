import type { Bucket } from "@google-cloud/storage";

/** The few things the server asks of its object storage. Cloud Storage in production. */
export interface ObjectStore {
  readonly read: (name: string) => Promise<Uint8Array | undefined>;
  readonly write: (name: string, data: Uint8Array) => Promise<void>;
  readonly remove: (name: string) => Promise<void>;
  /** The names of every object whose name starts with `prefix`. */
  readonly list: (prefix: string) => Promise<string[]>;
}

const NOT_FOUND = 404;

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && Reflect.get(error, "code") === NOT_FOUND;
}

/** Creates a store over a Cloud Storage bucket. The bucket keeps old versions as a safety net. */
export function createBucketStore(bucket: Bucket): ObjectStore {
  return {
    read: async (name) => {
      try {
        const [contents] = await bucket.file(name).download();
        return new Uint8Array(contents);
      } catch (error) {
        if (isNotFound(error)) return undefined;
        throw error;
      }
    },
    write: async (name, data) => {
      await bucket.file(name).save(Buffer.from(data), { resumable: false });
    },
    remove: async (name) => {
      await bucket.file(name).delete({ ignoreNotFound: true });
    },
    list: async (prefix) => {
      const [files] = await bucket.getFiles({ prefix });
      return files.map((file) => file.name);
    },
  };
}

/** Creates a store held in memory, for tests and running the server locally. */
export function createMemoryStore(): ObjectStore {
  const objects = new Map<string, Uint8Array>();
  return {
    read: (name) => Promise.resolve(objects.get(name)),
    write: (name, data) => {
      objects.set(name, data);
      return Promise.resolve();
    },
    remove: (name) => {
      objects.delete(name);
      return Promise.resolve();
    },
    list: (prefix) =>
      Promise.resolve([...objects.keys()].filter((name) => name.startsWith(prefix))),
  };
}
