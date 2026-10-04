/** A set of change listeners: what an external store hands to `useSyncExternalStore`. */
export interface Listeners {
  /** Registers a listener; returns the function that removes it. */
  readonly subscribe: (listener: () => void) => () => void;
  readonly notify: () => void;
}

/** Creates an empty set of listeners. */
export function createListeners(): Listeners {
  const listeners = new Set<() => void>();
  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    notify: () => {
      for (const listener of listeners) listener();
    },
  };
}
