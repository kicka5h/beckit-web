import { isValidAutomergeUrl } from "@automerge/automerge-repo";

import type { ObjectStore } from "./object-store.ts";

const USERS_PREFIX = "users/";

/** What the registry stores for each writer. */
interface LibraryRecord {
  readonly libraryUrl: string;
}

function recordNameOf(uid: string): string {
  return `${USERS_PREFIX}${encodeURIComponent(uid)}.json`;
}

function isLibraryRecord(value: unknown): value is LibraryRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    isValidAutomergeUrl(Reflect.get(value, "libraryUrl"))
  );
}

/** Reads the address of a writer's library, or undefined before any device has claimed one. */
export async function readLibraryUrl(store: ObjectStore, uid: string): Promise<string | undefined> {
  const stored = await store.read(recordNameOf(uid));
  if (!stored) return undefined;
  const record: unknown = JSON.parse(new TextDecoder().decode(stored));
  return isLibraryRecord(record) ? record.libraryUrl : undefined;
}

/**
 * Makes `libraryUrl` the writer's library unless one is already registered, and returns the one
 * that holds. The first device to sync sets it; every later device adopts it.
 */
export async function claimLibraryUrl(
  store: ObjectStore,
  uid: string,
  libraryUrl: string,
): Promise<string> {
  const existing = await readLibraryUrl(store, uid);
  if (existing) return existing;
  const record: LibraryRecord = { libraryUrl };
  await store.write(recordNameOf(uid), new TextEncoder().encode(JSON.stringify(record)));
  return libraryUrl;
}
