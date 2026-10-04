import { Repo } from "@automerge/automerge-repo";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";

const DATABASE_NAME = "beckit";

/**
 * Creates the store that holds every manuscript and chapter on this device. Chapter sessions
 * already batch keystrokes, so each change is saved at once rather than debounced again.
 */
export function createDeviceRepo(): Repo {
  return new Repo({ storage: new IndexedDBStorageAdapter(DATABASE_NAME), saveDebounceRate: 0 });
}
