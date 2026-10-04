import { createListeners } from "../events/listeners.ts";

/** The part of a service worker registration this module uses. */
export interface WorkerRegistration {
  readonly update: () => Promise<unknown>;
}

/** What `registerSW` from `virtual:pwa-register` is told, narrowed to what this module uses. */
export interface RegisterOptions {
  readonly onNeedRefresh: () => void;
  readonly onNeedReload: () => void;
  readonly onRegisteredSW: (url: string, registration: WorkerRegistration | undefined) => void;
}

/** Registers the service worker and returns the function that activates a waiting version. */
export type RegisterServiceWorker = (options: RegisterOptions) => () => Promise<void>;

/** Newer versions of the app itself: whether one is waiting, and the reload that installs it. */
export interface AppUpdate {
  /** Registers a listener called when a newer version is waiting; returns its remover. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Whether a newer version has downloaded and waits for a reload. */
  readonly isWaiting: () => boolean;
  /** Stores everything written so far, then reloads into the newer version. */
  readonly install: () => Promise<void>;
}

/** What `createAppUpdate` needs from the page. */
export interface AppUpdateOptions {
  readonly register: RegisterServiceWorker;
  /** Stores everything written so far. */
  readonly flush: () => Promise<void>;
  /** Arranges for the page to reload once the newer version has taken it over. */
  readonly reloadWhenReplaced: () => void;
}

/** How often an open app looks for a newer version: a Home Screen app can stay open for days. */
const CHECK_INTERVAL_MILLISECONDS = 60 * 60 * 1000;

/** Reloads the page once a newer service worker has taken it over. */
export function reloadWhenReplaced(): void {
  navigator.serviceWorker.addEventListener(
    "controllerchange",
    () => {
      window.location.reload();
    },
    { once: true },
  );
}

/**
 * Creates the app's update service. A newer version waits until the writer chooses to reload,
 * rather than replacing the app under them; `flush` stores their writing first.
 */
export function createAppUpdate({
  register,
  flush,
  reloadWhenReplaced: onReplaced,
}: AppUpdateOptions): AppUpdate {
  const listeners = createListeners();
  let isWaiting = false;
  const activate = register({
    onNeedRefresh: () => {
      isWaiting = true;
      listeners.notify();
    },
    // The plugin reloads only a page the old version already controlled, missing a first visit;
    // `install` reloads in every case instead.
    onNeedReload: () => undefined,
    onRegisteredSW: (_url, registration) => {
      if (!registration) return;
      setInterval(() => {
        // Offline, the check fails; the next one tries again.
        registration.update().catch(() => undefined);
      }, CHECK_INTERVAL_MILLISECONDS);
    },
  });
  return {
    subscribe: listeners.subscribe,
    isWaiting: () => isWaiting,
    install: async () => {
      await flush();
      onReplaced();
      await activate();
    },
  };
}
