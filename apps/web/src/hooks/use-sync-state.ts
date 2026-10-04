import { useSyncExternalStore } from "react";

import type { SyncClient, SyncState } from "../sync/sync-client.ts";

function subscribeToNothing(): () => void {
  return () => undefined;
}

/** Where sync stands, re-rendering as it changes; undefined in a build without sync. */
export function useSyncState(sync: SyncClient | undefined): SyncState | undefined {
  return useSyncExternalStore(sync?.subscribe ?? subscribeToNothing, () => sync?.state);
}
