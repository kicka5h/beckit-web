import type * as Automerge from "@automerge/automerge";
import type { DocHandle } from "@automerge/automerge-repo";
import { useCallback, useSyncExternalStore } from "react";

/** The current contents of a stored document, re-rendering whenever it changes. */
export function useDoc<Value>(handle: DocHandle<Value>): Automerge.Doc<Value> {
  const subscribe = useCallback(
    (listener: () => void) => {
      handle.on("change", listener);
      return () => {
        handle.off("change", listener);
      };
    },
    [handle],
  );
  return useSyncExternalStore(subscribe, () => handle.doc());
}
