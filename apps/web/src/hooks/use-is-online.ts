import { useSyncExternalStore } from "react";

function subscribeToConnection(listener: () => void): () => void {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

function readIsOnline(): boolean {
  return navigator.onLine;
}

/** Whether the device has a network connection, re-rendering as that changes. */
export function useIsOnline(): boolean {
  return useSyncExternalStore(subscribeToConnection, readIsOnline);
}
